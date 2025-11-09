import express from "express";
import cors from "cors";
import cron from "node-cron";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import {
  createAuthenticatedClient,
  OpenPaymentsClientError,
  isFinalizedGrant,
} from "@interledger/open-payments";

// Configurar dayjs
dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

const TIMEZONE = "America/Mexico_City";
dayjs.tz.setDefault(TIMEZONE);

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("✅ Backend Open Payments activo! Usa POST /pago para iniciar pagos.");
});

// Almacenamiento temporal de grants
let lastOutgoingGrant = null;

// Almacenamiento para pagos programados
let tareasProgramadas = [];
let grantsPendientes = {}; // Almacenar grants generados esperando aprobación

// Base de datos simulada de causas
const causasDB = [
  {
    id: "cruz-roja",
    nombre: "Cruz Roja Mexicana",
    descripcion: "Apoya a las víctimas de desastres naturales y emergencias médicas en todo México.",
    icono: "🏥",
    meta: 500000,
    recaudado: 287000,
    walletAddress: "https://ilp.interledger-test.dev/cruz_roja_mexicana"
  },
  {
    id: "unicef",
    nombre: "UNICEF México",
    descripcion: "Protege los derechos de la infancia y provee ayuda humanitaria a niños en situación vulnerable.",
    icono: "👶",
    meta: 750000,
    recaudado: 423000,
    walletAddress: "https://ilp.interledger-test.dev/unicef"
  },
  {
    id: "reforestacion",
    nombre: "Reforestación Nacional",
    descripcion: "Proyecto para plantar 1 millón de árboles en zonas deforestadas de México.",
    icono: "🌳",
    meta: 300000,
    recaudado: 189000,
    walletAddress: "https://ilp.interledger-test.dev/reforestacion_nacional"
  },
  {
    id: "educacion",
    nombre: "Educación para Todos",
    descripcion: "Becas y materiales escolares para niños de comunidades marginadas.",
    icono: "📚",
    meta: 400000,
    recaudado: 256000,
    walletAddress: "https://ilp.interledger-test.dev/educacion_para_todos"
  },
  {
    id: "animales",
    nombre: "Refugio Animal",
    descripcion: "Rescate, cuidado y adopción de animales en situación de calle.",
    icono: "🐾",
    meta: 150000,
    recaudado: 98000,
    walletAddress: "https://ilp.interledger-test.dev/refugio_animal"
  }
];

// FUNCIÓN HELPER: Normalizar wallet address a URL
function normalizarWalletAddress(address) {
  if (!address) return null;
  
  // Si ya es una URL completa, devolverla tal cual
  if (address.startsWith('https://') || address.startsWith('http://')) {
    return address;
  }
  
  // Si es un payment pointer ($), convertir a URL
  if (address.startsWith('$')) {
    return address.replace('$', 'https://');
  }
  
  // Si no tiene prefijo, asumir que es payment pointer sin $
  return `https://${address}`;
}

// Endpoint para obtener todas las causas
app.get("/causas", (req, res) => {
  res.json(causasDB);
});

// Endpoint de pago para transferencias y QR (CORREGIDO)
app.post("/pago", async (req, res) => {
  try {
    const { monto, destinatario, concepto } = req.body;

    if (!destinatario) {
      return res.status(400).json({ error: "Se requiere destinatario" });
    }

    // Si no se proporciona monto, usar valor por defecto de 10 MXN
    const montoTransferencia = monto ? parseFloat(monto) : 10;
    const montoEnCentavos = Math.round(montoTransferencia * 100).toString();

    console.log('💳 Pago iniciado:', { monto: montoTransferencia, destinatario, concepto });

    const client = await createAuthenticatedClient({
      walletAddressUrl: "https://ilp.interledger-test.dev/alex_saga",
      privateKey: "./private.key",
      keyId: "5739c44f-f712-4acf-afaa-d3b72aaa3e20",
    });

    const sendingWallet = await client.walletAddress.get({
      url: "https://ilp.interledger-test.dev/remitente_saga",
    });

    // CORRECCIÓN: Normalizar wallet address (funciona con URLs y payment pointers)
    const destinatarioUrl = normalizarWalletAddress(destinatario);
    console.log('📍 Destinatario normalizado:', destinatarioUrl);

    const receivingWallet = await client.walletAddress.get({
      url: destinatarioUrl,
    });

    const incomingPaymentGrant = await client.grant.request(
      { url: receivingWallet.authServer },
      { access_token: { access: [{ type: "incoming-payment", actions: ["read","create","complete"] }] } }
    );

    const incomingPayment = await client.incomingPayment.create(
      { url: receivingWallet.resourceServer, accessToken: incomingPaymentGrant.access_token.value },
      { 
        walletAddress: receivingWallet.id, 
        incomingAmount: { 
          assetCode: receivingWallet.assetCode, 
          assetScale: receivingWallet.assetScale, 
          value: montoEnCentavos 
        },
        metadata: {
          description: concepto || 'Pago'
        }
      }
    );

    const quoteGrant = await client.grant.request(
      { url: sendingWallet.authServer },
      { access_token: { access: [{ type: "quote", actions: ["read","create"] }] } }
    );

    const quote = await client.quote.create(
      { url: sendingWallet.resourceServer, accessToken: quoteGrant.access_token.value },
      { walletAddress: sendingWallet.id, receiver: incomingPayment.id, method: "ilp" }
    );

    const outgoingPaymentGrant = await client.grant.request(
      { url: sendingWallet.authServer },
      {
        access_token: {
          access: [
            {
              type: "outgoing-payment",
              actions: ["read","create"],
              limits: { 
                debitAmount: { 
                  assetCode: quote.debitAmount.assetCode, 
                  assetScale: quote.debitAmount.assetScale, 
                  value: quote.debitAmount.value 
                } 
              },
              identifier: sendingWallet.id,
            },
          ],
        },
        interact: { start: ["redirect"] },
      }
    );

    lastOutgoingGrant = { 
      client, 
      outgoingPaymentGrant, 
      sendingWallet, 
      quote,
      monto: montoTransferencia,
      destinatario,
      concepto
    };

    console.log('✅ Pago iniciado correctamente');

    res.json({
      message: `Transferencia de ${montoTransferencia} MXN iniciada`,
      url: outgoingPaymentGrant.interact.redirect,
      destinatario: destinatario
    });

  } catch (err) {
    console.error("❌ Error en pago:", err);
    if (err instanceof OpenPaymentsClientError) {
      res.status(400).json({ error: err.description || err.message });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// Endpoint para donaciones
app.post("/donar", async (req, res) => {
  try {
    const { causaId, monto } = req.body;

    if (!causaId || !monto) {
      return res.status(400).json({ error: "Se requiere causaId y monto" });
    }

    const causa = causasDB.find(c => c.id === causaId);
    if (!causa) {
      return res.status(404).json({ error: "Causa no encontrada" });
    }

    const montoEnCentavos = Math.round(parseFloat(monto) * 100).toString();

    console.log('💝 Donación iniciada:', { causaId, monto, causa: causa.nombre });

    const client = await createAuthenticatedClient({
      walletAddressUrl: "https://ilp.interledger-test.dev/alex_saga",
      privateKey: "./private.key",
      keyId: "5739c44f-f712-4acf-afaa-d3b72aaa3e20",
    });

    const sendingWallet = await client.walletAddress.get({
      url: "https://ilp.interledger-test.dev/remitente_saga",
    });
    
    const receivingWallet = await client.walletAddress.get({
      url: causa.walletAddress,
    });

    const incomingPaymentGrant = await client.grant.request(
      { url: receivingWallet.authServer },
      { access_token: { access: [{ type: "incoming-payment", actions: ["read","create","complete"] }] } }
    );

    const incomingPayment = await client.incomingPayment.create(
      { url: receivingWallet.resourceServer, accessToken: incomingPaymentGrant.access_token.value },
      { 
        walletAddress: receivingWallet.id, 
        incomingAmount: { 
          assetCode: receivingWallet.assetCode, 
          assetScale: receivingWallet.assetScale, 
          value: montoEnCentavos 
        } 
      }
    );

    const quoteGrant = await client.grant.request(
      { url: sendingWallet.authServer },
      { access_token: { access: [{ type: "quote", actions: ["read","create"] }] } }
    );

    const quote = await client.quote.create(
      { url: sendingWallet.resourceServer, accessToken: quoteGrant.access_token.value },
      { walletAddress: sendingWallet.id, receiver: incomingPayment.id, method: "ilp" }
    );

    const outgoingPaymentGrant = await client.grant.request(
      { url: sendingWallet.authServer },
      {
        access_token: {
          access: [
            {
              type: "outgoing-payment",
              actions: ["read","create"],
              limits: { 
                debitAmount: { 
                  assetCode: quote.debitAmount.assetCode, 
                  assetScale: quote.debitAmount.assetScale, 
                  value: quote.debitAmount.value 
                } 
              },
              identifier: sendingWallet.id,
            },
          ],
        },
        interact: { start: ["redirect"] },
      }
    );

    lastOutgoingGrant = { 
      client, 
      outgoingPaymentGrant, 
      sendingWallet, 
      quote,
      causaId,
      monto: parseFloat(monto)
    };

    console.log('✅ Donación iniciada correctamente');

    res.json({
      message: `Donación de $${monto} a ${causa.nombre} iniciada`,
      url: outgoingPaymentGrant.interact.redirect,
      causa: causa.nombre
    });

  } catch (err) {
    console.error("❌ Error en donación:", err);
    if (err instanceof OpenPaymentsClientError) {
      res.status(400).json({ error: err.description || err.message });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// Endpoint para finalizar pago (usado para pagos, donaciones y voz)
app.post("/finalizar-pago", async (req, res) => {
  try {
    if (!lastOutgoingGrant) {
      return res.status(400).json({ error: "No hay grant pendiente" });
    }

    const { client, outgoingPaymentGrant, sendingWallet, quote, causaId, monto } = lastOutgoingGrant;

    const finalizedGrant = await client.grant.continue({
      url: outgoingPaymentGrant.continue.uri,
      accessToken: outgoingPaymentGrant.continue.access_token.value,
    });

    if (!isFinalizedGrant(finalizedGrant)) {
      return res.status(400).json({ error: "Grant no finalizado" });
    }

    const outgoingPayment = await client.outgoingPayment.create(
      { url: sendingWallet.resourceServer, accessToken: finalizedGrant.access_token.value },
      { walletAddress: sendingWallet.id, quoteId: quote.id }
    );

    // Si es una donación, actualizar el monto recaudado
    if (causaId && monto) {
      const causa = causasDB.find(c => c.id === causaId);
      if (causa) {
        causa.recaudado += monto;
        console.log(`✅ Donación completada: $${monto} a ${causa.nombre}`);
      }
    }

    lastOutgoingGrant = null;

    console.log('✅ Pago finalizado correctamente');

    res.json({ 
      message: causaId ? "Donación completada exitosamente" : "Pago realizado correctamente", 
      outgoingPayment 
    });

  } catch (err) {
    console.error("❌ Error finalizando pago:", err);
    if (err instanceof OpenPaymentsClientError) {
      res.status(400).json({ error: err.description || err.message });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// Endpoint específico para asistente de voz
app.post("/pago-voz", async (req, res) => {
  try {
    const { monto, destinatario, concepto } = req.body;

    if (!monto || !destinatario) {
      return res.status(400).json({ error: "Se requiere monto y destinatario" });
    }

    console.log('🎤 Pago por voz:', { monto, destinatario, concepto });

    const montoTransferencia = parseFloat(monto);
    const montoEnCentavos = Math.round(montoTransferencia * 100).toString();

    const client = await createAuthenticatedClient({
      walletAddressUrl: "https://ilp.interledger-test.dev/alex_saga",
      privateKey: "./private.key",
      keyId: "5739c44f-f712-4acf-afaa-d3b72aaa3e20",
    });

    const sendingWallet = await client.walletAddress.get({
      url: "https://ilp.interledger-test.dev/remitente_saga",
    });

    // Normalizar wallet address
    const destinatarioUrl = normalizarWalletAddress(destinatario);
    console.log('📍 Destinatario URL:', destinatarioUrl);
    
    const receivingWallet = await client.walletAddress.get({
      url: destinatarioUrl,
    });

    const incomingPaymentGrant = await client.grant.request(
      { url: receivingWallet.authServer },
      { access_token: { access: [{ type: "incoming-payment", actions: ["read","create","complete"] }] } }
    );

    const incomingPayment = await client.incomingPayment.create(
      { url: receivingWallet.resourceServer, accessToken: incomingPaymentGrant.access_token.value },
      { 
        walletAddress: receivingWallet.id, 
        incomingAmount: { 
          assetCode: receivingWallet.assetCode, 
          assetScale: receivingWallet.assetScale, 
          value: montoEnCentavos 
        },
        metadata: {
          description: concepto || 'Pago por voz'
        }
      }
    );

    const quoteGrant = await client.grant.request(
      { url: sendingWallet.authServer },
      { access_token: { access: [{ type: "quote", actions: ["read","create"] }] } }
    );

    const quote = await client.quote.create(
      { url: sendingWallet.resourceServer, accessToken: quoteGrant.access_token.value },
      { walletAddress: sendingWallet.id, receiver: incomingPayment.id, method: "ilp" }
    );

    const outgoingPaymentGrant = await client.grant.request(
      { url: sendingWallet.authServer },
      {
        access_token: {
          access: [
            {
              type: "outgoing-payment",
              actions: ["read","create"],
              limits: { 
                debitAmount: { 
                  assetCode: quote.debitAmount.assetCode, 
                  assetScale: quote.debitAmount.assetScale, 
                  value: quote.debitAmount.value 
                } 
              },
              identifier: sendingWallet.id,
            },
          ],
        },
        interact: { start: ["redirect"] },
      }
    );

    lastOutgoingGrant = { 
      client, 
      outgoingPaymentGrant, 
      sendingWallet, 
      quote,
      monto: montoTransferencia,
      destinatario,
      concepto,
      tipo: 'voz'
    };

    console.log('✅ Pago por voz iniciado correctamente');

    res.json({
      message: `Transferencia de ${montoTransferencia} MXN iniciada a ${destinatario}`,
      url: outgoingPaymentGrant.interact.redirect,
      destinatario: destinatario
    });

  } catch (err) {
    console.error("❌ Error en pago por voz:", err);
    if (err instanceof OpenPaymentsClientError) {
      res.status(400).json({ error: err.description || err.message });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// ==================== PAGOS PROGRAMADOS ====================

app.get("/hora-servidor", (req, res) => {
  const ahora = dayjs();
  const en2min = ahora.add(2, 'minute');
  const en5min = ahora.add(5, 'minute');
  
  res.json({
    horaActual: ahora.format("YYYY-MM-DD HH:mm:ss"),
    en2Minutos: en2min.format("YYYY-MM-DD HH:mm"),
    en5Minutos: en5min.format("YYYY-MM-DD HH:mm"),
    formatoParaApp: en2min.format("YYYY-MM-DD HH:mm"),
    timestamp: ahora.valueOf()
  });
});

// 📅 Programar pago
app.post("/programar-pago", (req, res) => {
  const { destinatario, monto, fecha, descripcion } = req.body;

  if (!destinatario || !monto || !fecha) {
    return res.status(400).json({ error: "destinatario, monto y fecha son requeridos" });
  }

  let fechaProgramada = dayjs(fecha);
  if (!fechaProgramada.isValid()) {
    fechaProgramada = dayjs(fecha, "YYYY-MM-DD HH:mm");
  }

  const ahora = dayjs();
  
  console.log(`📅 Validando fecha:`);
  console.log(`   - Fecha recibida: ${fecha}`);
  console.log(`   - Fecha parseada: ${fechaProgramada.format("YYYY-MM-DD HH:mm:ss")}`);
  console.log(`   - Hora actual: ${ahora.format("YYYY-MM-DD HH:mm:ss")}`);

  if (!fechaProgramada.isValid()) {
    return res.status(400).json({ 
      error: "Fecha inválida. Usa formato: YYYY-MM-DD HH:mm",
      ejemplos: ["2025-11-09 14:30", "2025-11-08 20:00"]
    });
  }

  if (fechaProgramada.isBefore(ahora)) {
    return res.status(400).json({ 
      error: "La fecha debe ser futura",
      horaActual: ahora.format("YYYY-MM-DD HH:mm"),
      fechaRecibida: fechaProgramada.format("YYYY-MM-DD HH:mm")
    });
  }

  const nuevaTarea = {
    id: Date.now().toString(),
    destinatario,
    monto: parseFloat(monto),
    descripcion: descripcion || "Pago programado",
    fecha: fechaProgramada.toISOString(),
    estado: "pendiente",
    createdAt: new Date().toISOString(),
    grantGenerado: false
  };

  tareasProgramadas.push(nuevaTarea);
  console.log(`📅 Pago programado: $${monto} a ${destinatario} el ${fechaProgramada.format("YYYY-MM-DD HH:mm")}`);

  res.json({ 
    message: "Pago programado correctamente", 
    tarea: nuevaTarea 
  });
});

// 📋 Obtener tareas programadas
app.get("/tareas-programadas", (req, res) => {
  res.json(tareasProgramadas);
});

// 🔔 Obtener notificaciones pendientes (grants esperando aprobación)
app.get("/notificaciones-pendientes", (req, res) => {
  const pendientes = Object.values(grantsPendientes).map(grant => ({
    tareaId: grant.tareaId,
    descripcion: grant.descripcion,
    monto: grant.monto,
    destinatario: grant.destinatario,
    url: grant.url,
    fechaGeneracion: grant.fechaGeneracion
  }));
  
  res.json(pendientes);
});

// 🗑 Cancelar tarea
app.delete("/tareas-programadas/:id", (req, res) => {
  const { id } = req.params;
  const index = tareasProgramadas.findIndex(t => t.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: "Tarea no encontrada" });
  }

  tareasProgramadas.splice(index, 1);
  
  if (grantsPendientes[id]) {
    delete grantsPendientes[id];
  }
  
  res.json({ message: "Tarea cancelada exitosamente" });
});

// Función para generar el grant cuando llega la hora
async function generarGrantParaPago(tarea) {
  try {
    if (tarea.grantGenerado) {
      console.log(`⚠️ Grant ya generado para tarea ${tarea.id}, omitiendo...`);
      return false;
    }

    console.log(`🔔 Generando grant para pago: $${tarea.monto} a ${tarea.destinatario}`);

    const client = await createAuthenticatedClient({
      walletAddressUrl: "https://ilp.interledger-test.dev/alex_saga",
      privateKey: "./private.key",
      keyId: "5739c44f-f712-4acf-afaa-d3b72aaa3e20",
    });

    const sendingWallet = await client.walletAddress.get({
      url: "https://ilp.interledger-test.dev/alex_saga",
    });

    const receivingWallet = await client.walletAddress.get({
      url: tarea.destinatario,
    });

    const incomingPaymentGrant = await client.grant.request(
      { url: receivingWallet.authServer },
      { access_token: { access: [{ type: "incoming-payment", actions: ["read","create","complete"] }] } }
    );

    const montoEnCentavos = Math.round(tarea.monto * 100).toString();

    const incomingPayment = await client.incomingPayment.create(
      { url: receivingWallet.resourceServer, accessToken: incomingPaymentGrant.access_token.value },
      {
        walletAddress: receivingWallet.id,
        incomingAmount: {
          assetCode: receivingWallet.assetCode,
          assetScale: receivingWallet.assetScale,
          value: montoEnCentavos,
        },
      }
    );

    const quoteGrant = await client.grant.request(
      { url: sendingWallet.authServer },
      { access_token: { access: [{ type: "quote", actions: ["read","create"] }] } }
    );

    const quote = await client.quote.create(
      { url: sendingWallet.resourceServer, accessToken: quoteGrant.access_token.value },
      { walletAddress: sendingWallet.id, receiver: incomingPayment.id, method: "ilp" }
    );

    const outgoingPaymentGrant = await client.grant.request(
      { url: sendingWallet.authServer },
      {
        access_token: {
          access: [
            {
              type: "outgoing-payment",
              actions: ["read", "create"],
              limits: {
                debitAmount: {
                  assetCode: quote.debitAmount.assetCode,
                  assetScale: quote.debitAmount.assetScale,
                  value: quote.debitAmount.value,
                },
              },
              identifier: sendingWallet.id,
            },
          ],
        },
        interact: { start: ["redirect"] },
      }
    );

    grantsPendientes[tarea.id] = {
      tareaId: tarea.id,
      client,
      outgoingPaymentGrant,
      sendingWallet,
      quote,
      monto: tarea.monto,
      descripcion: tarea.descripcion,
      destinatario: tarea.destinatario,
      url: outgoingPaymentGrant.interact.redirect,
      fechaGeneracion: new Date().toISOString()
    };

    tarea.grantGenerado = true;
    tarea.estado = "esperando_aprobacion";
    tarea.urlAprobacion = outgoingPaymentGrant.interact.redirect;
    
    console.log(`✅ Grant generado para tarea ${tarea.id}`);
    console.log(`🔗 URL de aprobación: ${outgoingPaymentGrant.interact.redirect}`);
    
    return true;

  } catch (err) {
    console.error("❌ Error generando grant:", err.message);
    tarea.estado = "error";
    tarea.error = err.message;
    return false;
  }
}

// 💳 Finalizar pago programado (después de que el usuario aprobó)
app.post("/finalizar-pago-programado/:tareaId", async (req, res) => {
  try {
    const { tareaId } = req.params;
    
    const grantPendiente = grantsPendientes[tareaId];
    if (!grantPendiente) {
      return res.status(404).json({ error: "No hay grant pendiente para esta tarea" });
    }

    const { client, outgoingPaymentGrant, sendingWallet, quote } = grantPendiente;

    console.log(`💳 Finalizando pago programado para tarea ${tareaId}...`);

    const finalizedGrant = await client.grant.continue({
      url: outgoingPaymentGrant.continue.uri,
      accessToken: outgoingPaymentGrant.continue.access_token.value,
    });

    if (!isFinalizedGrant(finalizedGrant)) {
      return res.status(400).json({ error: "Grant no finalizado correctamente" });
    }

    const outgoingPayment = await client.outgoingPayment.create(
      { url: sendingWallet.resourceServer, accessToken: finalizedGrant.access_token.value },
      { walletAddress: sendingWallet.id, quoteId: quote.id }
    );

    const tarea = tareasProgramadas.find(t => t.id === tareaId);
    if (tarea) {
      tarea.estado = "completado";
      tarea.completedAt = new Date().toISOString();
    }

    delete grantsPendientes[tareaId];

    console.log(`✅ Pago programado completado: ${grantPendiente.monto}`);

    res.json({ 
      message: "Pago programado completado exitosamente", 
      outgoingPayment 
    });

  } catch (err) {
    console.error("Error finalizando pago programado:", err);
    if (err instanceof OpenPaymentsClientError) {
      res.status(400).json({ error: err.description || err.message });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// ⏰ Cron job: revisar cada minuto
cron.schedule("* * * * *", async () => {
  const ahora = dayjs();
  console.log(`\n⏰ [${ahora.format("HH:mm:ss")}] Revisando tareas programadas...`);
  
  const tareasPendientes = tareasProgramadas.filter(t => t.estado === "pendiente");
  console.log(`   📋 Tareas pendientes: ${tareasPendientes.length}`);

  for (const tarea of tareasPendientes) {
    if (!tarea.grantGenerado && ahora.isAfter(dayjs(tarea.fecha))) {
      console.log(`\n   🔔 ¡Hora de pago! ${tarea.monto} → ${tarea.destinatario.split("/").pop()}`);
      await generarGrantParaPago(tarea);
    } else if (!tarea.grantGenerado) {
      const diff = dayjs(tarea.fecha).diff(ahora, 'minute');
      console.log(`   ⏳ Tarea pendiente en ${diff} minuto(s): ${tarea.monto}`);
    }
  }
  
  const grantsEsperando = Object.keys(grantsPendientes).length;
  if (grantsEsperando > 0) {
    console.log(`   🔔 Grants esperando aprobación: ${grantsEsperando}`);
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Servidor Open Payments corriendo en http://192.168.1.229:${PORT}`);
  console.log(`⏰ Sistema de pagos programados activo`);
});