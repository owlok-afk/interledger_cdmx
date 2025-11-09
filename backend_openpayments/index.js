import express from "express";
import cors from "cors";
import {
  createAuthenticatedClient,
  OpenPaymentsClientError,
  isFinalizedGrant,
} from "@interledger/open-payments";

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("✅ Backend Open Payments activo! Usa POST /pago para iniciar pagos.");
});

// Almacenamiento temporal de grants
let lastOutgoingGrant = null;

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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Servidor Open Payments corriendo en http://192.168.1.229:${PORT}`);
});