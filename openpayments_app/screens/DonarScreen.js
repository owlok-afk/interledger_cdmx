import React, { useState, useEffect } from "react";
import { 
  StyleSheet, 
  Text, 
  View, 
  ActivityIndicator, 
  Linking, 
  Alert,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import axios from "axios";

const API_URL = "http://192.168.1.229:4000";

export default function DonarScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [causas, setCausas] = useState([]);
  const [causaSeleccionada, setCausaSeleccionada] = useState(null);
  const [montoDonacion, setMontoDonacion] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [grantUrl, setGrantUrl] = useState(null);

  // Cargar causas al montar el componente
  useEffect(() => {
    cargarCausas();
  }, []);

  const cargarCausas = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/causas`);
      setCausas(res.data);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "No se pudieron cargar las causas. Verifica tu conexión.");
    } finally {
      setLoading(false);
    }
  };

  const abrirModalDonacion = (causa) => {
    setCausaSeleccionada(causa);
    setMontoDonacion("");
    setModalVisible(true);
  };

  const procesarDonacion = async () => {
    if (!montoDonacion || parseFloat(montoDonacion) <= 0) {
      Alert.alert("Error", "Por favor ingresa un monto válido.");
      return;
    }

    setModalVisible(false);
    setLoading(true);

    try {
      const res = await axios.post(`${API_URL}/donar`, {
        causaId: causaSeleccionada.id,
        monto: montoDonacion
      });
      
      setGrantUrl(res.data.url);
      
      Alert.alert(
        "Donación Iniciada", 
        `Estás donando $${montoDonacion} a ${causaSeleccionada.nombre}.\n\n¿Deseas abrir el enlace de autorización?`,
        [
          { text: "Más tarde", style: "cancel" },
          { text: "Abrir ahora", onPress: () => Linking.openURL(res.data.url) }
        ]
      );
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "No se pudo procesar la donación. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const finalizarDonacion = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/finalizar-pago`);
      Alert.alert(
        "¡Donación Completada! 🎉", 
        "Tu donación ha sido procesada exitosamente. ¡Gracias por tu contribución!",
        [
          { 
            text: "Volver", 
            onPress: () => {
              setGrantUrl(null);
              cargarCausas(); // Recargar causas para ver el progreso actualizado
            }
          }
        ]
      );
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "No se pudo finalizar la donación.");
    } finally {
      setLoading(false);
    }
  };

  const calcularProgreso = (recaudado, meta) => {
    return Math.min((recaudado / meta) * 100, 100);
  };

  const montosRapidos = ["50", "100", "200", "500"];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>💝 Causas para Donar</Text>
        <Text style={styles.headerSubtitle}>Tu contribución hace la diferencia</Text>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#28a745" />
          <Text style={styles.loadingText}>Cargando causas...</Text>
        </View>
      )}

      {/* Botón para finalizar donación si hay grant pendiente */}
      {grantUrl && (
        <View style={styles.finalizarContainer}>
          <Text style={styles.finalizarTexto}>
            ¿Ya autorizaste la donación?
          </Text>
          <TouchableOpacity 
            style={styles.finalizarButton}
            onPress={finalizarDonacion}
            disabled={loading}
          >
            <FontAwesome name="check-circle" size={20} color="#fff" />
            <Text style={styles.finalizarButtonText}>Finalizar Donación</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {causas.map((causa) => {
          const progreso = calcularProgreso(causa.recaudado, causa.meta);
          
          return (
            <View key={causa.id} style={styles.causaCard}>
              <View style={styles.causaHeader}>
                <Text style={styles.causaIcono}>{causa.icono}</Text>
                <View style={styles.causaInfo}>
                  <Text style={styles.causaNombre}>{causa.nombre}</Text>
                </View>
              </View>
              
              <Text style={styles.causaDescripcion}>{causa.descripcion}</Text>
              
              <View style={styles.progresoContainer}>
                <View style={styles.progresoBar}>
                  <View style={[styles.progresoFill, { width: `${progreso}%` }]} />
                </View>
                <View style={styles.progresoInfo}>
                  <Text style={styles.progresoTexto}>
                    ${causa.recaudado.toLocaleString()} de ${causa.meta.toLocaleString()} MXN
                  </Text>
                  <Text style={styles.progresoPorc}>{progreso.toFixed(1)}%</Text>
                </View>
              </View>

              <TouchableOpacity 
                style={styles.donarButton}
                onPress={() => abrirModalDonacion(causa)}
              >
                <FontAwesome name="heart" size={18} color="#fff" />
                <Text style={styles.donarButtonText}>Donar Ahora</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {!loading && causas.length === 0 && (
          <View style={styles.emptyContainer}>
            <FontAwesome name="inbox" size={60} color="#ccc" />
            <Text style={styles.emptyText}>No hay causas disponibles</Text>
          </View>
        )}
      </ScrollView>

      {/* Modal de Donación */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <FontAwesome name="times" size={24} color="#666" />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Realizar Donación</Text>
            
            {causaSeleccionada && (
              <>
                <View style={styles.modalCausaInfo}>
                  <Text style={styles.modalCausaIcono}>{causaSeleccionada.icono}</Text>
                  <Text style={styles.modalCausaNombre}>
                    {causaSeleccionada.nombre}
                  </Text>
                </View>

                <Text style={styles.inputLabel}>Monto a donar (MXN):</Text>
                
                {/* Botones de montos rápidos */}
                <View style={styles.montosRapidos}>
                  {montosRapidos.map((monto) => (
                    <TouchableOpacity
                      key={monto}
                      style={[
                        styles.montoRapidoButton,
                        montoDonacion === monto && styles.montoRapidoSeleccionado
                      ]}
                      onPress={() => setMontoDonacion(monto)}
                    >
                      <Text style={[
                        styles.montoRapidoText,
                        montoDonacion === monto && styles.montoRapidoTextSeleccionado
                      ]}>
                        ${monto}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  style={styles.input}
                  placeholder="O ingresa otro monto"
                  keyboardType="numeric"
                  value={montoDonacion}
                  onChangeText={setMontoDonacion}
                />

                <View style={styles.modalButtons}>
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.buttonText}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.modalButton, styles.confirmarButton]}
                    onPress={procesarDonacion}
                  >
                    <Text style={styles.buttonText}>Donar ${montoDonacion || "0"}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#f2f2f2" 
  },
  headerContainer: {
    backgroundColor: "#28a745",
    padding: 20,
    paddingTop: 15,
    alignItems: "center"
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 5
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#fff",
    opacity: 0.9
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
  finalizarContainer: {
    backgroundColor: "#fff3cd",
    padding: 15,
    margin: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ffc107"
  },
  finalizarTexto: {
    fontSize: 14,
    color: "#856404",
    marginBottom: 10,
    textAlign: "center",
    fontWeight: "500"
  },
  finalizarButton: {
    backgroundColor: "#28a745",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    gap: 8
  },
  finalizarButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold"
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    padding: 15,
    paddingBottom: 30
  },
  causaCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  causaHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12
  },
  causaIcono: {
    fontSize: 40,
    marginRight: 15
  },
  causaInfo: {
    flex: 1
  },
  causaNombre: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333"
  },
  causaDescripcion: {
    fontSize: 14,
    color: "#666",
    marginBottom: 15,
    lineHeight: 20
  },
  progresoContainer: {
    marginBottom: 15
  },
  progresoBar: {
    height: 12,
    backgroundColor: "#e0e0e0",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 8
  },
  progresoFill: {
    height: "100%",
    backgroundColor: "#28a745",
    borderRadius: 6
  },
  progresoInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  progresoTexto: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333"
  },
  progresoPorc: {
    fontSize: 12,
    color: "#28a745",
    fontWeight: "bold"
  },
  donarButton: {
    backgroundColor: "#28a745",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    borderRadius: 8,
    gap: 8
  },
  donarButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold"
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    marginTop: 15
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center"
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 25,
    width: "90%",
    maxWidth: 400,
    maxHeight: "80%"
  },
  closeButton: {
    alignSelf: "flex-end",
    padding: 5
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#333"
  },
  modalCausaInfo: {
    alignItems: "center",
    marginBottom: 20,
    padding: 15,
    backgroundColor: "#f8f9fa",
    borderRadius: 10
  },
  modalCausaIcono: {
    fontSize: 50,
    marginBottom: 10
  },
  modalCausaNombre: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    color: "#28a745"
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 10,
    color: "#333"
  },
  montosRapidos: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
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
    borderColor: "#28a745",
    backgroundColor: "#e8f5e9"
  },
  montoRapidoText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666"
  },
  montoRapidoTextSeleccionado: {
    color: "#28a745"
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: "#fff"
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: "center"
  },
  cancelButton: {
    backgroundColor: "#6c757d"
  },
  confirmarButton: {
    backgroundColor: "#28a745"
  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold"
  }
});