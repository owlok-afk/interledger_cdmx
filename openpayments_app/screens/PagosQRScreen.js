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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerIcon}>💳</Text>
        <Text style={styles.headerTitle}>Pagos con QR</Text>
        <Text style={styles.headerSubtitle}>Escanea o genera códigos QR para pagos</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Procesando...</Text>
          </View>
        )}

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
            <Text style={styles.inputLabel}>Ingresa el monto a pagar:</Text>
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
          <View style={styles.finalizarContainer}>
            <View style={styles.alertBox}>
              <Text style={styles.alertText}>⚠️ Pago pendiente de autorización</Text>
            </View>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => Linking.openURL(grantUrl)}
            >
              <Text style={styles.linkButtonText}>Abrir enlace de autorización</Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Ya autorizaste?</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.finalizeButton}
              onPress={finalizarPago}
              disabled={loading}
            >
              <Text style={styles.finalizeButtonText}>✅ Finalizar pago</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

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
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Generar Código QR</Text>
            <TouchableOpacity 
              style={styles.closeButtonModal}
              onPress={() => {
                setShowQRGenerator(false);
                setQrData(null);
                setPaymentAmount("");
                setSelectedAccount("");
              }}
            >
              <Text style={styles.closeButtonModalText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.inputLabel}>Selecciona tu cuenta:</Text>
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

          <Text style={styles.inputLabel}>Monto (opcional, para pagos fijos):</Text>
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
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f2f2",
  },
  headerContainer: {
    backgroundColor: "#fff",
    padding: 30,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0"
  },
  headerIcon: {
    fontSize: 40,
    marginBottom: 10
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666"
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 30
  },
  loadingContainer: {
    padding: 30,
    alignItems: "center"
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
    fontSize: 14
  },
  buttonGroup: {
    marginBottom: 15,
    width: "100%",
  },
  mainButton: {
    backgroundColor: "#007AFF",
    padding: 18,
    borderRadius: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  secondaryButton: {
    backgroundColor: "#007AFF",
  },
  mainButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 10,
    color: "#333"
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: "#fff",
    color: "#333"
  },
  confirmButton: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  finalizarContainer: {
    marginTop: 20,
  },
  alertBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff3cd",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ffc107"
  },
  alertText: {
    flex: 1,
    fontSize: 14,
    color: "#856404",
    fontWeight: "500"
  },
  linkButton: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#007AFF",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 15,
  },
  linkButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 15
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#ddd"
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 12,
    color: "#666"
  },
  finalizeButton: {
    backgroundColor: "#28a745",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  finalizeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  amountContainer: {
    marginTop: 20,
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  scannerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
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
  qrGeneratorContainer: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0"
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333"
  },
  closeButtonModal: {
    padding: 5
  },
  closeButtonModalText: {
    fontSize: 24,
    color: "#666"
  },
  accountButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
    gap: 8
  },
  accountButton: {
    padding: 18,
    backgroundColor: "#fff",
    borderRadius: 8,
    flex: 1,
    borderWidth: 2,
    borderColor: "#ddd",
    alignItems: "center"
  },
  accountButtonSelected: {
    backgroundColor: "#e3f2fd",
    borderColor: "#007AFF",
  },
  accountButtonText: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  accountButtonTextSelected: {
    color: "#007AFF",
  },
  generateButton: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  generateButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  qrDisplay: {
    alignItems: "center",
    marginTop: 20,
    padding: 20,
    backgroundColor: "#f8f9fa",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  qrInfo: {
    marginTop: 10,
    fontSize: 14,
    color: "#333",
    textAlign: "center",
    fontWeight: "600"
  },
});
