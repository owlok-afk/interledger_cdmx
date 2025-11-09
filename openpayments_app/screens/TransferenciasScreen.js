import React, { useState } from "react";
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput,
  TouchableOpacity,
  ActivityIndicator, 
  Linking, 
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import axios from "axios";

const API_URL = "http://192.168.1.229:4000";

// Lista de contactos predefinidos
const CONTACTOS = [
  {
    id: 1,
    nombre: "Tienda 199",
    wallet: "$ilp.interledger-test.dev/tienda_199",
    icono: "🏪",
    tipo: "Negocio"
  },
  {
    id: 2,
    nombre: "Itzel",
    wallet: "$ilp.interledger-test.dev/itzel_12",
    icono: "👩",
    tipo: "Personal"
  },
  {
    id: 3,
    nombre: "Tienda Prueba",
    wallet: "$ilp.interledger-test.dev/tienda_prueba",
    icono: "🛒",
    tipo: "Negocio"
  },
  {
    id: 4,
    nombre: "Eduardo",
    wallet: "$ilp.interledger-test.dev/eduardo_99",
    icono: "👨",
    tipo: "Personal"
  }
];

export default function TransferenciasScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [grantUrl, setGrantUrl] = useState(null);
  const [monto, setMonto] = useState("");
  const [destinatario, setDestinatario] = useState("");
  const [concepto, setConcepto] = useState("");
  const [showContactos, setShowContactos] = useState(false);
  const [contactoSeleccionado, setContactoSeleccionado] = useState(null);

  const seleccionarContacto = (contacto) => {
    setContactoSeleccionado(contacto);
    setDestinatario(contacto.wallet);
    setShowContactos(false);
  };

  const crearTransferencia = async () => {
    // Validaciones
    if (!monto || parseFloat(monto) <= 0) {
      Alert.alert("Error", "Por favor ingresa un monto válido.");
      return;
    }

    if (!destinatario.trim()) {
      Alert.alert("Error", "Por favor selecciona un contacto o ingresa un destinatario.");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/pago`, {
        monto: parseFloat(monto),
        destinatario: destinatario.trim(),
        concepto: concepto.trim() || "Transferencia"
      });
      
      setGrantUrl(res.data.url);
      
      Alert.alert(
        "Transferencia Iniciada",
        `Transferencia de $${monto} MXN a ${contactoSeleccionado?.nombre || destinatario}.\n\n¿Deseas abrir el enlace de autorización?`,
        [
          { text: "Más tarde", style: "cancel" },
          { text: "Abrir ahora", onPress: () => Linking.openURL(res.data.url) }
        ]
      );
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "No se pudo crear la transferencia. Verifica tu conexión o el backend.");
    } finally {
      setLoading(false);
    }
  };

  const finalizarTransferencia = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/finalizar-pago`);
      
      Alert.alert(
        "¡Transferencia Completada! ✅",
        `La transferencia de $${monto} MXN se realizó correctamente.`,
        [
          {
            text: "Aceptar",
            onPress: () => {
              // Limpiar formulario
              setMonto("");
              setDestinatario("");
              setConcepto("");
              setGrantUrl(null);
              setContactoSeleccionado(null);
            }
          }
        ]
      );
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "No se pudo finalizar la transferencia.");
    } finally {
      setLoading(false);
    }
  };

  const montosRapidos = ["100", "500", "1000", "2000"];

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerContainer}>
          <FontAwesome name="exchange" size={40} color="#007AFF" />
          <Text style={styles.headerTitle}>Nueva Transferencia</Text>
          <Text style={styles.headerSubtitle}>Envía dinero de forma segura</Text>
        </View>

        {/* Formulario */}
        <View style={styles.formContainer}>
          {/* Destinatario - Selector de Contactos */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              <FontAwesome name="user" size={14} color="#007AFF" /> Destinatario
            </Text>
            
            {contactoSeleccionado ? (
              <View style={styles.contactoSeleccionadoContainer}>
                <View style={styles.contactoSeleccionado}>
                  <Text style={styles.contactoIcono}>{contactoSeleccionado.icono}</Text>
                  <View style={styles.contactoInfo}>
                    <Text style={styles.contactoNombre}>{contactoSeleccionado.nombre}</Text>
                    <Text style={styles.contactoWallet}>{contactoSeleccionado.wallet}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setContactoSeleccionado(null);
                      setDestinatario("");
                    }}
                    disabled={loading}
                  >
                    <FontAwesome name="times-circle" size={24} color="#dc3545" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.selectContactButton}
                  onPress={() => setShowContactos(true)}
                  disabled={loading}
                >
                  <FontAwesome name="address-book" size={20} color="#007AFF" />
                  <Text style={styles.selectContactButtonText}>Seleccionar de mis contactos</Text>
                  <FontAwesome name="chevron-right" size={16} color="#007AFF" />
                </TouchableOpacity>
                
                <View style={styles.dividerContainer}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>o ingresa manualmente</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TextInput
                  style={styles.input}
                  placeholder="$ilp.interledger-test.dev/usuario"
                  value={destinatario}
                  onChangeText={setDestinatario}
                  editable={!loading}
                  autoCapitalize="none"
                />
              </>
            )}
          </View>

          {/* Monto */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              <FontAwesome name="dollar" size={14} color="#007AFF" /> Monto (MXN)
            </Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              keyboardType="numeric"
              value={monto}
              onChangeText={setMonto}
              editable={!loading}
            />
            
            {/* Montos Rápidos */}
            <View style={styles.montosRapidos}>
              {montosRapidos.map((montoRapido) => (
                <TouchableOpacity
                  key={montoRapido}
                  style={[
                    styles.montoRapidoButton,
                    monto === montoRapido && styles.montoRapidoSeleccionado
                  ]}
                  onPress={() => setMonto(montoRapido)}
                  disabled={loading}
                >
                  <Text style={[
                    styles.montoRapidoText,
                    monto === montoRapido && styles.montoRapidoTextSeleccionado
                  ]}>
                    ${montoRapido}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Concepto (Opcional) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              <FontAwesome name="comment" size={14} color="#007AFF" /> Concepto (opcional)
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Ej: Pago de renta, préstamo, etc."
              value={concepto}
              onChangeText={setConcepto}
              multiline
              numberOfLines={3}
              editable={!loading}
            />
          </View>

          {/* Resumen */}
          {monto && destinatario && (
            <View style={styles.resumenContainer}>
              <Text style={styles.resumenTitle}>Resumen de la transferencia:</Text>
              <View style={styles.resumenRow}>
                <Text style={styles.resumenLabel}>Monto:</Text>
                <Text style={styles.resumenValue}>${parseFloat(monto).toLocaleString()} MXN</Text>
              </View>
              <View style={styles.resumenRow}>
                <Text style={styles.resumenLabel}>Destinatario:</Text>
                <Text style={styles.resumenValue}>
                  {contactoSeleccionado ? contactoSeleccionado.nombre : destinatario}
                </Text>
              </View>
              {concepto && (
                <View style={styles.resumenRow}>
                  <Text style={styles.resumenLabel}>Concepto:</Text>
                  <Text style={styles.resumenValue}>{concepto}</Text>
                </View>
              )}
            </View>
          )}

          {/* Botón Crear Transferencia */}
          {!grantUrl && (
            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary, loading && styles.buttonDisabled]}
              onPress={crearTransferencia}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <FontAwesome name="send" size={18} color="#fff" />
                  <Text style={styles.buttonText}>Iniciar Transferencia</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Sección de Autorización */}
          {grantUrl && (
            <View style={styles.autorizacionContainer}>
              <View style={styles.alertBox}>
                <FontAwesome name="exclamation-circle" size={24} color="#ffc107" />
                <Text style={styles.alertText}>
                  Transferencia pendiente de autorización
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => Linking.openURL(grantUrl)}
                disabled={loading}
              >
                <FontAwesome name="external-link" size={18} color="#007AFF" />
                <Text style={[styles.buttonText, { color: "#007AFF" }]}>
                  Abrir enlace de autorización
                </Text>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>Ya autorizaste?</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={[styles.button, styles.buttonSuccess, loading && styles.buttonDisabled]}
                onPress={finalizarTransferencia}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <FontAwesome name="check-circle" size={18} color="#fff" />
                    <Text style={styles.buttonText}>Finalizar Transferencia</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setGrantUrl(null);
                  setMonto("");
                  setDestinatario("");
                  setConcepto("");
                  setContactoSeleccionado(null);
                }}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancelar transferencia</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Información adicional */}
        <View style={styles.infoContainer}>
          <FontAwesome name="info-circle" size={16} color="#666" />
          <Text style={styles.infoText}>
            Las transferencias son procesadas de forma segura mediante Open Payments.
          </Text>
        </View>
      </ScrollView>

      {/* Modal de Contactos */}
      <Modal
        visible={showContactos}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowContactos(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar Contacto</Text>
              <TouchableOpacity onPress={() => setShowContactos(false)}>
                <FontAwesome name="times" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.contactosList}>
              {CONTACTOS.map((contacto) => (
                <TouchableOpacity
                  key={contacto.id}
                  style={styles.contactoItem}
                  onPress={() => seleccionarContacto(contacto)}
                >
                  <View style={styles.contactoItemContent}>
                    <Text style={styles.contactoItemIcono}>{contacto.icono}</Text>
                    <View style={styles.contactoItemInfo}>
                      <Text style={styles.contactoItemNombre}>{contacto.nombre}</Text>
                      <Text style={styles.contactoItemWallet}>{contacto.wallet}</Text>
                      <Text style={styles.contactoItemTipo}>
                        <FontAwesome name="tag" size={10} color="#999" /> {contacto.tipo}
                      </Text>
                    </View>
                    <FontAwesome name="chevron-right" size={20} color="#007AFF" />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f2f2"
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    paddingBottom: 30
  },
  headerContainer: {
    backgroundColor: "#fff",
    padding: 30,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0"
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 15,
    marginBottom: 5
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666"
  },
  formContainer: {
    padding: 20
  },
  inputGroup: {
    marginBottom: 20
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    color: "#333"
  },
  textArea: {
    height: 80,
    textAlignVertical: "top"
  },
  selectContactButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#007AFF",
    borderRadius: 8,
    padding: 15,
    marginBottom: 15
  },
  selectContactButtonText: {
    flex: 1,
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
    marginLeft: 10
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10
  },
  contactoSeleccionadoContainer: {
    marginBottom: 10
  },
  contactoSeleccionado: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e3f2fd",
    borderWidth: 2,
    borderColor: "#007AFF",
    borderRadius: 8,
    padding: 15
  },
  contactoIcono: {
    fontSize: 32,
    marginRight: 15
  },
  contactoInfo: {
    flex: 1
  },
  contactoNombre: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 2
  },
  contactoWallet: {
    fontSize: 12,
    color: "#666"
  },
  montosRapidos: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    gap: 8
  },
  montoRapidoButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#ddd",
    alignItems: "center",
    backgroundColor: "#fff"
  },
  montoRapidoSeleccionado: {
    borderColor: "#007AFF",
    backgroundColor: "#e3f2fd"
  },
  montoRapidoText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666"
  },
  montoRapidoTextSeleccionado: {
    color: "#007AFF"
  },
  resumenContainer: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e0e0e0"
  },
  resumenTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10
  },
  resumenRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5
  },
  resumenLabel: {
    fontSize: 14,
    color: "#666"
  },
  resumenValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333"
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    gap: 10
  },
  buttonPrimary: {
    backgroundColor: "#007AFF"
  },
  buttonSecondary: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#007AFF"
  },
  buttonSuccess: {
    backgroundColor: "#28a745"
  },
  buttonDisabled: {
    opacity: 0.5
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold"
  },
  autorizacionContainer: {
    marginTop: 10
  },
  alertBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff3cd",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    gap: 10,
    borderWidth: 1,
    borderColor: "#ffc107"
  },
  alertText: {
    flex: 1,
    fontSize: 14,
    color: "#856404",
    fontWeight: "500"
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
  cancelButton: {
    alignItems: "center",
    padding: 10
  },
  cancelButtonText: {
    color: "#dc3545",
    fontSize: 14,
    fontWeight: "600"
  },
  infoContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 8,
    gap: 10
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: "#666",
    lineHeight: 18
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end"
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingBottom: 20
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0"
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333"
  },
  contactosList: {
    paddingHorizontal: 20
  },
  contactoItem: {
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    paddingVertical: 15
  },
  contactoItemContent: {
    flexDirection: "row",
    alignItems: "center"
  },
  contactoItemIcono: {
    fontSize: 36,
    marginRight: 15
  },
  contactoItemInfo: {
    flex: 1
  },
  contactoItemNombre: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 3
  },
  contactoItemWallet: {
    fontSize: 12,
    color: "#666",
    marginBottom: 3
  },
  contactoItemTipo: {
    fontSize: 11,
    color: "#999"
  }
});