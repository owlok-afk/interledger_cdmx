import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  Button,
  ActivityIndicator,
  Linking,
  Alert,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from "react-native";
import axios from "axios";
import { Camera, CameraView } from "expo-camera";
import QRCode from "react-native-qrcode-svg";

// ⚠️ IMPORTANTE: Cambia esta IP por la IP de tu computadora donde corre el backend
// Para encontrarla: En Windows usa "ipconfig", en Mac/Linux usa "ifconfig"
const API_URL = "http://192.168.1.229:4000"; // Cambia por tu IP local

export default function PagosQRScreen() {
  const [loading, setLoading] = useState(false);
  const [grantUrl, setGrantUrl] = useState(null);
  
  // Estados para QR
  const [showScanner, setShowScanner] = useState(false);
  const [showQRGenerator, setShowQRGenerator] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [scannedData, setScannedData] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [qrData, setQrData] = useState(null);

  // Solicitar permisos de cámara
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  const finalizarPago = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/finalizar-pago`);
      Alert.alert("Éxito", "Pago completado correctamente ✅");
      setGrantUrl(null);
      setScannedData(null);
      setPaymentAmount("");
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "No se pudo finalizar el pago.");
    } finally {
      setLoading(false);
    }
  };

  // Función para escanear QR
  const handleBarCodeScanned = ({ data }) => {
    if (!data) return;
    
    setShowScanner(false);
    try {
      const qrInfo = JSON.parse(data);
      setScannedData(qrInfo);
      
      // Si el QR tiene monto, lo usa; si no, pide al usuario
      if (qrInfo.amount) {
        setPaymentAmount(qrInfo.amount.toString());
        Alert.alert(
          "QR Escaneado",
          `Cuenta: ${qrInfo.walletAddress}\nMonto: $${qrInfo.amount}`,
          [{ text: "Confirmar Pago", onPress: () => procesarPagoQR(qrInfo.walletAddress, qrInfo.amount) }]
        );
      } else {
        Alert.alert("QR Escaneado", `Cuenta: ${qrInfo.walletAddress}\nIngresa el monto a pagar`);
      }
    } catch (err) {
      Alert.alert("Error", "QR inválido. Debe contener JSON con walletAddress.");
    }
  };

  // Procesar pago desde QR - CORREGIDO para usar los parámetros correctos del backend
  const procesarPagoQR = async (wallet, amount) => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert("Error", "Ingresa un monto válido");
      return;
    }

    setLoading(true);
    try {
      // CORRECCIÓN: Usar los parámetros que el backend espera
      const res = await axios.post(`${API_URL}/pago`, {
        monto: parseFloat(amount),  // El backend espera "monto", no "amount"
        destinatario: wallet,       // El backend espera "destinatario", no "receiverWalletUrl"
        concepto: "Pago con QR"     // Concepto descriptivo
      });
      
      setGrantUrl(res.data.url);
      Alert.alert(
        "Pago Generado",
        `Monto: $${amount} MXN\nReceptor: ${wallet}\n\nAbre el enlace para autorizar`,
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Abrir enlace", onPress: () => Linking.openURL(res.data.url) },
        ]
      );
    } catch (err) {
      console.error(err);
      Alert.alert("Error", err.response?.data?.error || "No se pudo crear el pago QR");
    } finally {
      setLoading(false);
    }
  };

  // Generar QR
  const generarQR = () => {
    if (!selectedAccount) {
      Alert.alert("Error", "Selecciona una cuenta");
      return;
    }

    const qrPayload = {
      walletAddress: selectedAccount,
      ...(paymentAmount && { amount: parseFloat(paymentAmount) }),
    };

    setQrData(JSON.stringify(qrPayload));
    Alert.alert("QR Generado", "Comparte este código QR para recibir pagos");
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text>Solicitando permisos de cámara...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text>No hay acceso a la cámara</Text>
        <Button title="Solicitar permisos" onPress={() => Camera.requestCameraPermissionsAsync()} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>💳 Pagos con QR</Text>

      {loading && <ActivityIndicator size="large" color="#007AFF" style={{ margin: 20 }} />}

      {/* Botones principales */}
      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={styles.mainButton}
          onPress={() => setShowScanner(true)}
          disabled={loading}
        >
          <Text style={styles.mainButtonText}>📷 Escanear QR para pagar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={[styles.mainButton, styles.secondaryButton]}
          onPress={() => setShowQRGenerator(true)}
          disabled={loading}
        >
          <Text style={styles.mainButtonText}>🎫 Generar mi QR</Text>
        </TouchableOpacity>
      </View>

      {/* Si hay pago escaneado y sin monto, permitir ingresar */}
      {scannedData && !scannedData.amount && (
        <View style={styles.amountContainer}>
          <Text style={styles.label}>Ingresa el monto a pagar:</Text>
          <TextInput
            style={styles.input}
            placeholder="Ejemplo: 50"
            keyboardType="numeric"
            value={paymentAmount}
            onChangeText={setPaymentAmount}
          />
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={() => procesarPagoQR(scannedData.walletAddress, paymentAmount)}
          >
            <Text style={styles.confirmButtonText}>Confirmar Pago</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Botón finalizar pago */}
      {grantUrl && (
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => Linking.openURL(grantUrl)}
          >
            <Text style={styles.linkButtonText}>Abrir enlace de autorización</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.finalizeButton}
            onPress={finalizarPago}
            disabled={loading}
          >
            <Text style={styles.finalizeButtonText}>✅ Finalizar pago</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 📷 Modal Escáner QR */}
      <Modal visible={showScanner} animationType="slide">
        <View style={styles.scannerContainer}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            onBarcodeScanned={handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ["qr"],
            }}
          />
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowScanner(false)}
          >
            <Text style={styles.closeButtonText}>❌ Cerrar</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* 🎫 Modal Generador QR */}
      <Modal visible={showQRGenerator} animationType="slide">
        <ScrollView contentContainerStyle={styles.qrGeneratorContainer}>
          <Text style={styles.modalTitle}>Generar Código QR</Text>
          
          <Text style={styles.label}>Selecciona tu cuenta:</Text>
          <View style={styles.accountButtons}>
            <TouchableOpacity
              style={[
                styles.accountButton,
                selectedAccount === "https://ilp.interledger-test.dev/mesero" && styles.accountButtonSelected
              ]}
              onPress={() => setSelectedAccount("https://ilp.interledger-test.dev/mesero")}
            >
              <Text style={[
                styles.accountButtonText,
                selectedAccount === "https://ilp.interledger-test.dev/mesero" && styles.accountButtonTextSelected
              ]}>👨‍🍳 Mesero</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.accountButton,
                selectedAccount === "https://ilp.interledger-test.dev/tienda_prueba" && styles.accountButtonSelected
              ]}
              onPress={() => setSelectedAccount("https://ilp.interledger-test.dev/tienda_prueba")}
            >
              <Text style={[
                styles.accountButtonText,
                selectedAccount === "https://ilp.interledger-test.dev/tienda_prueba" && styles.accountButtonTextSelected
              ]}>🏪 Tienda</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Monto (opcional, para pagos fijos):</Text>
          <TextInput
            style={styles.input}
            placeholder="Deja vacío para monto libre"
            keyboardType="numeric"
            value={paymentAmount}
            onChangeText={setPaymentAmount}
          />
          
          <TouchableOpacity style={styles.generateButton} onPress={generarQR}>
            <Text style={styles.generateButtonText}>Generar QR</Text>
          </TouchableOpacity>

          {qrData && (
            <View style={styles.qrDisplay}>
              <QRCode value={qrData} size={200} />
              <Text style={styles.qrInfo}>{selectedAccount}</Text>
              {paymentAmount && <Text style={styles.qrInfo}>Monto: ${paymentAmount}</Text>}
            </View>
          )}

          <TouchableOpacity
            style={[styles.closeButton, { position: 'relative', marginTop: 20 }]}
            onPress={() => {
              setShowQRGenerator(false);
              setQrData(null);
              setPaymentAmount("");
              setSelectedAccount("");
            }}
          >
            <Text style={styles.closeButtonText}>❌ Cerrar</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#f2f2f2",
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 30,
    textAlign: "center",
    color: "#333",
  },
  buttonGroup: {
    marginTop: 15,
    width: "100%",
  },
  mainButton: {
    backgroundColor: "#007AFF",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  secondaryButton: {
    backgroundColor: "#34C759",
  },
  mainButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  confirmButton: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  linkButton: {
    backgroundColor: "#5856D6",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  linkButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  finalizeButton: {
    backgroundColor: "#34C759",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  finalizeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  scannerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  qrGeneratorContainer: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 15,
    marginBottom: 8,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  accountButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  accountButton: {
    padding: 18,
    backgroundColor: "#e0e0e0",
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 5,
    borderWidth: 2,
    borderColor: "transparent",
  },
  accountButtonSelected: {
    backgroundColor: "#007AFF",
    borderColor: "#0051D5",
  },
  accountButtonText: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  accountButtonTextSelected: {
    color: "#fff",
  },
  generateButton: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  generateButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  qrDisplay: {
    alignItems: "center",
    marginTop: 20,
    padding: 20,
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  qrInfo: {
    marginTop: 10,
    fontSize: 14,
    color: "#555",
    textAlign: "center",
  },
  amountContainer: {
    marginTop: 20,
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    width: "100%",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  closeButton: {
    position: "absolute",
    top: 50,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 15,
    borderRadius: 10,
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});