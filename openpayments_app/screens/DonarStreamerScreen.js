import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TextInput,
  Alert,
  Modal,
  Linking,
  ActivityIndicator,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import axios from "axios";

const API_URL = "http://192.168.1.229:4000";
const MONTOS_RAPIDOS = [50, 100, 200, 500];

export default function DonarStreamerScreen({ navigation, route }) {
  const { streamer, plataforma } = route.params;
  const [monto, setMonto] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [mostrarPublicamente, setMostrarPublicamente] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [grantUrl, setGrantUrl] = useState(null);
  const [esperandoAutorizacion, setEsperandoAutorizacion] = useState(false);

  const handleMontoRapido = (cantidad) => {
    setMonto(cantidad.toString());
  };

  const handleDonar = async () => {
    const montoNum = parseFloat(monto);

    if (!monto || montoNum <= 0) {
      Alert.alert("Error", "Por favor ingresa un monto válido");
      return;
    }

    if (montoNum > 12450) {
      Alert.alert("Error", "No tienes saldo suficiente");
      return;
    }

    setLoading(true);

    try {
      // Iniciar pago con el backend
      const res = await axios.post(`${API_URL}/pago`, {
        monto: montoNum,
        destinatario: "$ilp.interledger-test.dev/streaming_89",
        concepto: `Donación a ${streamer.nombre} en ${plataforma}${mensaje ? ` - ${mensaje}` : ""}`
      });

      setGrantUrl(res.data.url);
      setEsperandoAutorizacion(true);
      setLoading(false);

      Alert.alert(
        "Donación Iniciada",
        `Estás donando $${montoNum} MXN a ${streamer.nombre}.\n\n¿Deseas abrir el enlace de autorización ahora?`,
        [
          { 
            text: "Más tarde", 
            style: "cancel",
            onPress: () => {}
          },
          { 
            text: "Abrir ahora", 
            onPress: () => Linking.openURL(res.data.url)
          }
        ]
      );

    } catch (err) {
      setLoading(false);
      console.error("Error al iniciar donación:", err);
      
      const errorMsg = err.response?.data?.error || err.message || "Error desconocido";
      Alert.alert(
        "Error",
        `No se pudo iniciar la donación: ${errorMsg}`
      );
    }
  };

  const finalizarDonacion = async () => {
    setLoading(true);

    try {
      const res = await axios.post(`${API_URL}/finalizar-pago`);
      
      setLoading(false);
      setEsperandoAutorizacion(false);
      setGrantUrl(null);
      setShowSuccessModal(true);

      // Cerrar modal y volver después de 2.5 segundos
      setTimeout(() => {
        setShowSuccessModal(false);
        navigation.goBack();
      }, 2500);

    } catch (err) {
      setLoading(false);
      console.error("Error al finalizar donación:", err);
      
      const errorMsg = err.response?.data?.error || err.message || "Error desconocido";
      Alert.alert(
        "Error",
        `No se pudo finalizar la donación: ${errorMsg}\n\n¿Ya autorizaste el pago en el navegador?`
      );
    }
  };

  const abrirGrantUrl = () => {
    if (grantUrl) {
      Linking.openURL(grantUrl);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#68cb88" />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Streamer Info Card */}
          <View style={styles.streamerCard}>
            <View
              style={[
                styles.streamerAvatar,
                { backgroundColor: streamer.color + "20" },
              ]}
            >
              <FontAwesome
                name={streamer.avatar}
                size={40}
                color={streamer.color}
              />
            </View>

            <View style={styles.streamerInfo}>
              <Text style={styles.streamerNombre}>{streamer.nombre}</Text>
              <Text style={styles.streamerCategoria}>{streamer.categoria}</Text>
              <View style={styles.streamerMeta}>
                <FontAwesome name="users" size={14} color="#999" />
                <Text style={styles.metaText}>{streamer.seguidores}</Text>
                <Text style={styles.metaDivider}>•</Text>
                <Text style={styles.metaText}>{plataforma}</Text>
              </View>
            </View>

            {streamer.online && (
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>EN VIVO</Text>
              </View>
            )}
          </View>

          {/* Alerta de autorización pendiente */}
          {esperandoAutorizacion && grantUrl && (
            <View style={styles.authContainer}>
              <View style={styles.alertBox}>
                <FontAwesome name="exclamation-circle" size={24} color="#ffc107" />
                <Text style={styles.alertText}>
                  Donación pendiente de autorización
                </Text>
              </View>

              <TouchableOpacity
                style={styles.linkButton}
                onPress={abrirGrantUrl}
                disabled={loading}
              >
                <FontAwesome name="external-link" size={18} color="#68cb88" />
                <Text style={styles.linkButtonText}>
                  Abrir enlace de autorización
                </Text>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>¿Ya autorizaste?</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={styles.finalizarButton}
                onPress={finalizarDonacion}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <FontAwesome name="check-circle" size={18} color="#fff" />
                    <Text style={styles.finalizarButtonText}>
                      Completar Donación
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Monto Section */}
          {!esperandoAutorizacion && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Monto a donar</Text>

                <View style={styles.montoContainer}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={styles.montoInput}
                    placeholder="0.00"
                    placeholderTextColor="#ccc"
                    value={monto}
                    onChangeText={setMonto}
                    keyboardType="decimal-pad"
                    editable={!loading}
                  />
                  <Text style={styles.currency}>MXN</Text>
                </View>

                {/* Montos Rápidos */}
                <View style={styles.montosRapidos}>
                  {MONTOS_RAPIDOS.map((cantidad) => (
                    <TouchableOpacity
                      key={cantidad}
                      style={[
                        styles.montoRapidoBtn,
                        monto === cantidad.toString() && styles.montoRapidoSelected,
                      ]}
                      onPress={() => handleMontoRapido(cantidad)}
                      disabled={loading}
                    >
                      <Text
                        style={[
                          styles.montoRapidoText,
                          monto === cantidad.toString() &&
                            styles.montoRapidoTextSelected,
                        ]}
                      >
                        ${cantidad}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Mensaje Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Mensaje (opcional)</Text>

                <View style={styles.mensajeContainer}>
                  <TextInput
                    style={styles.mensajeInput}
                    placeholder="Escribe un mensaje de apoyo..."
                    placeholderTextColor="#999"
                    value={mensaje}
                    onChangeText={setMensaje}
                    multiline
                    maxLength={150}
                    editable={!loading}
                  />
                  <Text style={styles.characterCount}>{mensaje.length}/150</Text>
                </View>

                {/* Opción pública */}
                <TouchableOpacity
                  style={styles.publicOption}
                  onPress={() => setMostrarPublicamente(!mostrarPublicamente)}
                  disabled={loading}
                >
                  <View style={styles.checkboxContainer}>
                    <View
                      style={[
                        styles.checkbox,
                        mostrarPublicamente && styles.checkboxChecked,
                      ]}
                    >
                      {mostrarPublicamente && (
                        <FontAwesome name="check" size={14} color="#fff" />
                      )}
                    </View>
                    <Text style={styles.publicText}>Mostrar donación públicamente</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Resumen */}
              <View style={styles.resumenCard}>
                <Text style={styles.resumenTitle}>Resumen de donación</Text>

                <View style={styles.resumenRow}>
                  <Text style={styles.resumenLabel}>Destinatario</Text>
                  <Text style={styles.resumenValue}>{streamer.nombre}</Text>
                </View>

                <View style={styles.resumenRow}>
                  <Text style={styles.resumenLabel}>Plataforma</Text>
                  <Text style={styles.resumenValue}>{plataforma}</Text>
                </View>

                <View style={styles.resumenRow}>
                  <Text style={styles.resumenLabel}>Monto</Text>
                  <Text style={styles.resumenValue}>
                    ${monto || "0.00"} MXN
                  </Text>
                </View>

                <View style={styles.resumenRow}>
                  <Text style={styles.resumenLabel}>Comisión</Text>
                  <Text style={styles.resumenValue}>$0.00 MXN</Text>
                </View>

                <View style={styles.resumenDivider} />

                <View style={styles.resumenRow}>
                  <Text style={styles.resumenTotal}>Total</Text>
                  <Text style={styles.resumenTotalValue}>
                    ${monto || "0.00"} MXN
                  </Text>
                </View>
              </View>

              {/* Balance Info */}
              <View style={styles.balanceInfo}>
                <FontAwesome name="wallet" size={16} color="#68cb88" />
                <Text style={styles.balanceText}>Saldo disponible: $12,450.00</Text>
              </View>

              {/* Botón de Donar */}
              <TouchableOpacity
                style={[
                  styles.donarButton,
                  (!monto || parseFloat(monto) <= 0 || loading) &&
                    styles.donarButtonDisabled,
                ]}
                onPress={handleDonar}
                disabled={!monto || parseFloat(monto) <= 0 || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <FontAwesome name="heart" size={20} color="#fff" />
                    <Text style={styles.donarButtonText}>Enviar Donación</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Success Modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIcon}>
              <FontAwesome name="check" size={40} color="#fff" />
            </View>
            <Text style={styles.successTitle}>¡Donación Exitosa!</Text>
            <Text style={styles.successMessage}>
              Tu apoyo ha sido enviado a {streamer.nombre}
            </Text>
            <Text style={styles.successAmount}>${monto} MXN</Text>
            <View style={styles.successFooter}>
              <FontAwesome name="heart" size={16} color="#ff7a7f" />
              <Text style={styles.successFooterText}>
                Gracias por apoyar a creadores
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  streamerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  streamerAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  streamerInfo: {
    flex: 1,
  },
  streamerNombre: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  streamerCategoria: {
    fontSize: 14,
    color: "#68cb88",
    fontWeight: "600",
    marginBottom: 8,
  },
  streamerMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    fontSize: 12,
    color: "#999",
    marginLeft: 4,
  },
  metaDivider: {
    fontSize: 12,
    color: "#ccc",
    marginHorizontal: 8,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ff4444",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff",
    marginRight: 6,
  },
  liveText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
  },
  authContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  alertBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff3cd",
    padding: 15,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#ffc107",
  },
  alertText: {
    flex: 1,
    fontSize: 14,
    color: "#856404",
    fontWeight: "600",
    marginLeft: 12,
  },
  linkButton: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#68cb88",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    borderRadius: 12,
    marginBottom: 16,
  },
  linkButtonText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#68cb88",
    marginLeft: 8,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e0e0e0",
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
    color: "#999",
    fontWeight: "500",
  },
  finalizarButton: {
    backgroundColor: "#68cb88",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#68cb88",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  finalizarButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  montoContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#68cb88",
    marginRight: 8,
  },
  montoInput: {
    flex: 1,
    fontSize: 36,
    fontWeight: "bold",
    color: "#333",
    padding: 0,
  },
  currency: {
    fontSize: 18,
    fontWeight: "600",
    color: "#999",
    marginLeft: 8,
  },
  montosRapidos: {
    flexDirection: "row",
    gap: 10,
  },
  montoRapidoBtn: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  montoRapidoSelected: {
    backgroundColor: "#68cb88",
    borderColor: "#68cb88",
  },
  montoRapidoText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#666",
  },
  montoRapidoTextSelected: {
    color: "#fff",
  },
  mensajeContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  mensajeInput: {
    fontSize: 15,
    color: "#333",
    minHeight: 80,
    textAlignVertical: "top",
  },
  characterCount: {
    fontSize: 12,
    color: "#999",
    textAlign: "right",
    marginTop: 8,
  },
  publicOption: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#68cb88",
    borderColor: "#68cb88",
  },
  publicText: {
    fontSize: 14,
    color: "#333",
    flex: 1,
  },
  resumenCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  resumenTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  resumenRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  resumenLabel: {
    fontSize: 14,
    color: "#666",
  },
  resumenValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
  },
  resumenDivider: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginVertical: 12,
  },
  resumenTotal: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  resumenTotalValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#68cb88",
  },
  balanceInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#68cb8815",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  balanceText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
    fontWeight: "600",
  },
  donarButton: {
    backgroundColor: "#ff7a7f",
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#ff7a7f",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  donarButtonDisabled: {
    backgroundColor: "#ccc",
    shadowOpacity: 0,
  },
  donarButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    width: "100%",
    maxWidth: 320,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#68cb88",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
    textAlign: "center",
  },
  successMessage: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 16,
  },
  successAmount: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#68cb88",
    marginBottom: 16,
  },
  successFooter: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ff7a7f15",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  successFooterText: {
    fontSize: 12,
    color: "#ff7a7f",
    fontWeight: "600",
    marginLeft: 6,
  },
});