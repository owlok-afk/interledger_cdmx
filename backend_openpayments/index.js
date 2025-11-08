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

let lastOutgoingGrant = null;

app.post("/pago", async (req, res) => {
  try {
    const client = await createAuthenticatedClient({
      walletAddressUrl: "https://ilp.interledger-test.dev/alex_saga",
      privateKey: "./private.key",
      keyId: "5739c44f-f712-4acf-afaa-d3b72aaa3e20",
    });

    const sendingWallet = await client.walletAddress.get({
      url: "https://ilp.interledger-test.dev/remitente_saga",
    });
    const receivingWallet = await client.walletAddress.get({
      url: "https://ilp.interledger-test.dev/receptor_saga",
    });

    const incomingPaymentGrant = await client.grant.request(
      { url: receivingWallet.authServer },
      { access_token: { access: [{ type: "incoming-payment", actions: ["read","create","complete"] }] } }
    );

    const incomingPayment = await client.incomingPayment.create(
      { url: receivingWallet.resourceServer, accessToken: incomingPaymentGrant.access_token.value },
      { walletAddress: receivingWallet.id, incomingAmount: { assetCode: receivingWallet.assetCode, assetScale: receivingWallet.assetScale, value: "1000" } }
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
              limits: { debitAmount: { assetCode: quote.debitAmount.assetCode, assetScale: quote.debitAmount.assetScale, value: quote.debitAmount.value } },
              identifier: sendingWallet.id,
            },
          ],
        },
        interact: { start: ["redirect"] },
      }
    );

    lastOutgoingGrant = { client, outgoingPaymentGrant, sendingWallet, quote };

    res.json({
      message: "Grant interactivo generado. Abre la URL para aceptar el pago",
      url: outgoingPaymentGrant.interact.redirect,
    });

  } catch (err) {
    if (err instanceof OpenPaymentsClientError) res.status(400).json({ error: err.description || err });
    else res.status(500).json({ error: err.message });
  }
});

app.post("/finalizar-pago", async (req, res) => {
  try {
    if (!lastOutgoingGrant) return res.status(400).json({ error: "No hay grant pendiente" });

    const { client, outgoingPaymentGrant, sendingWallet, quote } = lastOutgoingGrant;

    const finalizedGrant = await client.grant.continue({
      url: outgoingPaymentGrant.continue.uri,
      accessToken: outgoingPaymentGrant.continue.access_token.value,
    });

    if (!isFinalizedGrant(finalizedGrant)) return res.status(400).json({ error: "Grant no finalizado" });

    const outgoingPayment = await client.outgoingPayment.create(
      { url: sendingWallet.resourceServer, accessToken: finalizedGrant.access_token.value },
      { walletAddress: sendingWallet.id, quoteId: quote.id }
    );

    lastOutgoingGrant = null;

    res.json({ message: "Pago realizado correctamente", outgoingPayment });

  } catch (err) {
    if (err instanceof OpenPaymentsClientError) res.status(400).json({ error: err.description || err });
    else res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Servidor Open Payments corriendo en http://10.20.9.73:${PORT}`);
});
