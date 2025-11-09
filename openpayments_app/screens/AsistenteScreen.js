import React, { useState, useEffect } from "react";
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity,
  ActivityIndicator, 
  Linking, 
  Alert,
  ScrollView,
  Modal,
  Platform
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import axios from "axios";
import Voice from '@react-native-voice/voice';

const API_URL = "http://192.168.1.229:4000";

// Comandos predefinidos con patrones de reconocimiento
const COMANDOS = [
  {
    id: "netflix",
    patrones: ["pagar netflix", "pago netflix", "netflix"],
    nombre: "Netflix",
    descripcion: "Pagar suscripción de Netflix",
    monto: 199,
    destinatario: "$ilp.interledger-test.dev/netflix_mx",
    concepto: "Suscripción Netflix",
    icono: "🎬"
  },
  {
    id: "spotify",
    patrones: ["pagar spotify", "pago spotify", "spotify"],
    nombre: "Spotify",
    descripcion: "Pagar suscripción de Spotify",
    monto: 115,
    destinatario: "$ilp.interledger-test.dev/spotify_mx",
    concepto: "Suscripción Spotify",
    icono: "🎵"
  },
  {
    id: "luz",
    patrones: ["pagar luz", "pago luz", "luz", "cfe"],
    nombre: "CFE",
    descripcion: "Pagar recibo de luz",
    monto: 450,
    destinatario: "$ilp.interledger-test.dev/cfe",
    concepto: "Recibo de luz",
    icono: "💡"
  },
  {
    id: "agua",
    patrones: ["pagar agua", "pago agua", "agua"],
    nombre: "Agua",
    descripcion: "Pagar recibo de agua",
    monto: 180,
    destinatario: "$ilp.interledger-test.dev/agua_municipal",
    concepto: "Recibo de agua",
    icono: "💧"
  },
  {
    id: "receptor_saga",
    patrones: ["transferir a receptor saga", "enviar a receptor saga", "pagar receptor saga", "receptor saga", "saga"],
    nombre: "Receptor Saga",
    descripcion: "Transferencia a receptor_saga",
    monto: 100,
    destinatario: "$ilp.interledger-test.dev/receptor_saga",
    concepto: "Transferencia",
    icono: "👤"
  },
  {
    id: "tienda_199",
    patrones: ["pagar tienda", "tienda 199", "tienda ciento noventa y nueve"],
    nombre: "Tienda 199",
    descripcion: "Pago en Tienda 199",
    monto: 250,
    destinatario: "$ilp.interledger-test.dev/tienda_199",
    concepto: "Compra en tienda",
    icono: "🏪"
  },
  {
    id: "internet",
    patrones: ["pagar internet", "pago internet", "internet", "telmex"],
    nombre: "Internet",
    descripcion: "Pagar servicio de Internet",
    monto: 599,
    destinatario: "$ilp.interledger-test.dev/telmex",
    concepto: "Servicio de Internet",
    icono: "📡"
  },
  {
    id: "telefono",
    patrones: ["pagar teléfono", "pago telefono", "teléfono", "telefono", "recarga", "recargar", "telcel"],
    nombre: "Teléfono",
    descripcion: "Recarga telefónica",
    monto: 100,
    destinatario: "$ilp.interledger-test.dev/telcel",
    concepto: "Recarga telefónica",
    icono: "📱"
  }
];

export default function AsistenteScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [grantUrl, setGrantUrl] = useState(null);
  const [escuchando, setEscuchando] = useState(false);
  const [textoReconocido, setTextoReconocido] = useState("");
  const [comandoDetectado, setComandoDetectado] = useState(null);
  const [showComandos, setShowComandos] = useState(false);
  const [historial, setHistorial] = useState([]);
  const [voiceDisponible, setVoiceDisponible] = useState(false);
  const [resultadosParciales, setResultadosParciales] = useState([]);

  useEffect(() => {
    // Función async interna para inicializar Voice
    const setupVoice = async () => {
      try {
        await initVoice();
      } catch (error) {
        console.error('Error en setup de Voice:', error);
      }
    };
    
    // Ejecutar setup
    setupVoice();

    // Cleanup al desmontar el componente
    return () => {
      Voice.destroy()
        .then(() => {
          Voice.removeAllListeners();
        })
        .catch(e => console.error('Error cleaning up Voice:', e));
    };
  }, []);

  const initVoice = async () => {
    try {
      // Configurar eventos
      Voice.onSpeechStart = onSpeechStart;
      Voice.onSpeechEnd = onSpeechEnd;
      Voice.onSpeechResults = onSpeechResults;
      Voice.onSpeechPartialResults = onSpeechPartialResults;
      Voice.onSpeechError = onSpeechError;

      // Verificar disponibilidad
      const disponible = await Voice.isAvailable();
      setVoiceDisponible(disponible);
      console.log('Voice disponible:', disponible);

      if (!disponible) {
        Alert.alert(
          "Reconocimiento de Voz No Disponible",
          "Tu dispositivo no soporta reconocimiento de voz o no tienes permisos de micrófono.\n\nPuedes usar la selección manual de comandos.",
          [{ text: "Entendido" }]
        );
      }
    } catch (error) {
      console.error('Error inicializando Voice:', error);
      setVoiceDisponible(false);
      Alert.alert(
        "Error de Configuración",
        "No se pudo inicializar el reconocimiento de voz.\n\n¿Estás usando Expo Go? Este módulo requiere un development build.\n\nEjecuta: npx expo run:android",
        [{ text: "Entendido" }]
      );
    }
  };

  const onSpeechStart = (e) => {
    console.log('Reconocimiento iniciado', e);
    setResultadosParciales([]);
  };

  const onSpeechEnd = (e) => {
    console.log('Reconocimiento finalizado', e);
    setEscuchando(false);
  };

  const onSpeechPartialResults = (e) => {
    console.log('Resultados parciales:', e.value);
    if (e.value && e.value.length > 0) {
      setResultadosParciales(e.value);
      setTextoReconocido(e.value[0]);
    }
  };

  const onSpeechResults = (e) => {
    console.log('Resultados finales:', e.value);
    if (e.value && e.value.length > 0) {
      const texto = e.value[0];
      setTextoReconocido(texto);
      procesarComando(texto);
    } else {
      Alert.alert("Sin Resultados", "No se pudo reconocer ningún comando. Intenta de nuevo.");
    }
  };

  const onSpeechError = (e) => {
    console.error('Error en reconocimiento:', e);
    setEscuchando(false);
    
    let mensaje = "No se pudo reconocer el comando.";
    if (e.error?.message) {
      mensaje += `\n\nDetalle: ${e.error.message}`;
    }
    
    Alert.alert("Error", mensaje + "\n\nPuedes seleccionar un comando de la lista.");
  };

  const iniciarEscucha = async () => {
    if (!voiceDisponible) {
      Alert.alert(
        "Función No Disponible",
        "El reconocimiento de voz no está disponible.\n\n¿Estás usando Expo Go? Necesitas ejecutar:\nnpx expo run:android\n\nMientras tanto, usa la selección manual de comandos.",
        [{ text: "Ver Comandos", onPress: () => setShowComandos(true) }]
      );
      return;
    }

    try {
      // Cancelar cualquier sesión previa
      await Voice.cancel();
      
      setEscuchando(true);
      setTextoReconocido("Escuchando...");
      setResultadosParciales([]);
      
      await Voice.start('es-MX');
    } catch (error) {
      console.error('Error al iniciar Voice:', error);
      setEscuchando(false);
      Alert.alert(
        "Error al Iniciar",
        "No se pudo iniciar el reconocimiento de voz.\n\nVerifica los permisos de micrófono en la configuración de tu dispositivo.",
        [{ text: "Entendido" }]
      );
    }
  };

  const detenerEscucha = async () => {
    try {
      await Voice.stop();
      setEscuchando(false);
    } catch (error) {
      console.error('Error al detener Voice:', error);
      setEscuchando(false);
    }
  };

  const procesarComando = (texto) => {
    const textoNormalizado = texto.toLowerCase().trim();
    console.log('Procesando comando:', textoNormalizado);
    
    // Buscar comando que coincida
    const comando = COMANDOS.find(cmd => 
      cmd.patrones.some(patron => textoNormalizado.includes(patron.toLowerCase()))
    );

    if (comando) {
      setComandoDetectado(comando);
      
      Alert.alert(
        "Comando Reconocido ✅",
        `${comando.icono} ${comando.nombre}\nMonto: $${comando.monto} MXN\n\n¿Deseas procesar este pago?`,
        [
          { 
            text: "Cancelar", 
            style: "cancel",
            onPress: () => setComandoDetectado(null)
          },
          { 
            text: "Confirmar", 
            onPress: () => ejecutarComando(comando)
          }
        ]
      );
    } else {
      Alert.alert(
        "Comando No Reconocido ❌",
        `Dijiste: "${texto}"\n\nIntenta con:\n• Pagar Netflix\n• Pagar luz\n• Transferir a receptor saga\n\nO selecciona un comando de la lista.`,
        [
          { text: "Reintentar", onPress: () => iniciarEscucha() },
          { text: "Ver Lista", onPress: () => setShowComandos(true) }
        ]
      );
      setComandoDetectado(null);
    }
  };

  const ejecutarComando = async (comando) => {
    setLoading(true);
    
    try {
      const res = await axios.post(`${API_URL}/pago`, {
        monto: comando.monto,
        destinatario: comando.destinatario,
        concepto: comando.concepto
      });
      
      setGrantUrl(res.data.url);
      
      // Agregar al historial
      setHistorial(prev => [{
        id: Date.now(),
        comando: comando.nombre,
        monto: comando.monto,
        fecha: new Date().toLocaleTimeString(),
        icono: comando.icono
      }, ...prev.slice(0, 9)]);
      
      Alert.alert(
        "Pago Iniciado 🚀",
        `${comando.icono} ${comando.nombre}\nMonto: $${comando.monto} MXN\n\n¿Deseas abrir el enlace de autorización?`,
        [
          { text: "Más tarde", style: "cancel" },
          { text: "Abrir ahora", onPress: () => Linking.openURL(res.data.url) }
        ]
      );
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "No se pudo procesar el pago. Verifica tu conexión.");
    } finally {
      setLoading(false);
    }
  };

  const finalizarPago = async () => {
    setLoading(true);
    try {
      await axios.post(`${API_URL}/finalizar-pago`);
      
      Alert.alert(
        "¡Pago Completado! ✅",
        "El pago se realizó correctamente.",
        [
          {
            text: "Aceptar",
            onPress: () => {
              setGrantUrl(null);
              setComandoDetectado(null);
              setTextoReconocido("");
            }
          }
        ]
      );
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "No se pudo finalizar el pago.");
    } finally {
      setLoading(false);
    }
  };

  const seleccionarComandoManual = (comando) => {
    setShowComandos(false);
    setTextoReconocido(comando.patrones[0]);
    setComandoDetectado(comando);
    
    Alert.alert(
      "Comando Seleccionado",
      `${comando.icono} ${comando.nombre}\nMonto: $${comando.monto} MXN\n\n¿Deseas procesar este pago?`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Confirmar", onPress: () => ejecutarComando(comando) }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <FontAwesome name="microphone" size={40} color="#007AFF" />
        <Text style={styles.headerTitle}>Asistente de Voz</Text>
        <Text style={styles.headerSubtitle}>
          {voiceDisponible ? "Di un comando o selecciona de la lista" : "Selecciona un comando de la lista"}
        </Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Botón de Voz Principal */}
        {voiceDisponible && (
          <View style={styles.micContainer}>
            <TouchableOpacity
              style={[
                styles.micButton,
                escuchando && styles.micButtonActive,
                loading && styles.micButtonDisabled
              ]}
              onPress={escuchando ? detenerEscucha : iniciarEscucha}
              disabled={loading}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator size="large" color="#fff" />
              ) : (
                <>
                  <FontAwesome 
                    name={escuchando ? "stop-circle" : "microphone"} 
                    size={60} 
                    color="#fff" 
                  />
                  {escuchando && (
                    <>
                      <View style={styles.pulseRing} />
                      <View style={[styles.pulseRing, styles.pulseRing2]} />
                    </>
                  )}
                </>
              )}
            </TouchableOpacity>
            <Text style={styles.micInstruccion}>
              {loading ? "Procesando..." : escuchando ? "Escuchando... (toca para detener)" : "Toca para hablar"}
            </Text>
          </View>
        )}

        {/* Alerta si Voice no está disponible */}
        {!voiceDisponible && (
          <View style={styles.alertBox}>
            <FontAwesome name="exclamation-triangle" size={24} color="#ffc107" />
            <Text style={styles.alertText}>
              Reconocimiento de voz no disponible.{'\n'}
              Usa la selección manual de comandos.
            </Text>
          </View>
        )}

        {/* Texto Reconocido */}
        {textoReconocido && !escuchando && textoReconocido !== "Escuchando..." && (
          <View style={styles.textoReconocidoContainer}>
            <FontAwesome name="quote-left" size={16} color="#007AFF" />
            <Text style={styles.textoReconocido}>{textoReconocido}</Text>
          </View>
        )}

        {/* Resultados Parciales (mientras escucha) */}
        {escuchando && resultadosParciales.length > 0 && (
          <View style={styles.resultadosParcialesContainer}>
            <Text style={styles.resultadosParcialesText}>
              {resultadosParciales[0]}
            </Text>
          </View>
        )}

        {/* Comando Detectado */}
        {comandoDetectado && !grantUrl && (
          <View style={styles.comandoCard}>
            <Text style={styles.comandoIcono}>{comandoDetectado.icono}</Text>
            <Text style={styles.comandoNombre}>{comandoDetectado.nombre}</Text>
            <Text style={styles.comandoDescripcion}>{comandoDetectado.descripcion}</Text>
            <Text style={styles.comandoMonto}>${comandoDetectado.monto} MXN</Text>
          </View>
        )}

        {/* Botón Ver Comandos */}
        <TouchableOpacity
          style={styles.verComandosButton}
          onPress={() => setShowComandos(true)}
          disabled={loading}
        >
          <FontAwesome name="list" size={18} color="#007AFF" />
          <Text style={styles.verComandosText}>Ver todos los comandos</Text>
        </TouchableOpacity>

        {/* Sección de Autorización */}
        {grantUrl && (
          <View style={styles.autorizacionContainer}>
            <View style={styles.alertBox}>
              <FontAwesome name="exclamation-circle" size={24} color="#ffc107" />
              <Text style={styles.alertText}>
                Pago pendiente de autorización
              </Text>
            </View>

            <TouchableOpacity
              style={styles.linkButton}
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
              style={[styles.button, styles.buttonSuccess]}
              onPress={finalizarPago}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <FontAwesome name="check-circle" size={18} color="#fff" />
                  <Text style={styles.buttonText}>Finalizar Pago</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Historial */}
        {historial.length > 0 && (
          <View style={styles.historialContainer}>
            <Text style={styles.historialTitle}>Historial Reciente</Text>
            {historial.map(item => (
              <View key={item.id} style={styles.historialItem}>
                <Text style={styles.historialIcono}>{item.icono}</Text>
                <View style={styles.historialInfo}>
                  <Text style={styles.historialComando}>{item.comando}</Text>
                  <Text style={styles.historialFecha}>{item.fecha}</Text>
                </View>
                <Text style={styles.historialMonto}>${item.monto}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Información */}
        <View style={styles.infoContainer}>
          <FontAwesome name="info-circle" size={16} color="#666" />
          <Text style={styles.infoText}>
            {voiceDisponible 
              ? "Puedes decir comandos como 'Pagar Netflix', 'Pagar luz' o 'Transferir a receptor saga'"
              : "Selecciona un comando de la lista para realizar pagos rápidos"}
          </Text>
        </View>
      </ScrollView>

      {/* Modal de Comandos */}
      <Modal
        visible={showComandos}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowComandos(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Comandos Disponibles</Text>
              <TouchableOpacity onPress={() => setShowComandos(false)}>
                <FontAwesome name="times" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.comandosList}>
              {COMANDOS.map((comando) => (
                <TouchableOpacity
                  key={comando.id}
                  style={styles.comandoItem}
                  onPress={() => seleccionarComandoManual(comando)}
                >
                  <Text style={styles.comandoItemIcono}>{comando.icono}</Text>
                  <View style={styles.comandoItemInfo}>
                    <Text style={styles.comandoItemNombre}>{comando.nombre}</Text>
                    <Text style={styles.comandoItemDescripcion}>{comando.descripcion}</Text>
                    <Text style={styles.comandoItemPatron}>
                      💬 "{comando.patrones[0]}"
                    </Text>
                  </View>
                  <View style={styles.comandoItemMonto}>
                    <Text style={styles.comandoItemMontoTexto}>${comando.monto}</Text>
                    <FontAwesome name="chevron-right" size={16} color="#007AFF" />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
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
    color: "#666",
    textAlign: "center"
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 30
  },
  micContainer: {
    alignItems: "center",
    marginVertical: 30
  },
  micButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    position: "relative"
  },
  micButtonActive: {
    backgroundColor: "#dc3545"
  },
  micButtonDisabled: {
    backgroundColor: "#999"
  },
  pulseRing: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    borderColor: "#dc3545",
    opacity: 0.6
  },
  pulseRing2: {
    width: 180,
    height: 180,
    borderRadius: 90,
    opacity: 0.3
  },
  micInstruccion: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    paddingHorizontal: 20
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
  textoReconocidoContainer: {
    backgroundColor: "#e3f2fd",
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#007AFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  textoReconocido: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    fontStyle: "italic"
  },
  resultadosParcialesContainer: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: "#dc3545",
    borderStyle: "dashed"
  },
  resultadosParcialesText: {
    fontSize: 16,
    color: "#dc3545",
    fontWeight: "600",
    textAlign: "center"
  },
  comandoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 25,
    marginBottom: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: "#007AFF"
  },
  comandoIcono: {
    fontSize: 50,
    marginBottom: 10
  },
  comandoNombre: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5
  },
  comandoDescripcion: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 10
  },
  comandoMonto: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#007AFF"
  },
  verComandosButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#007AFF",
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    gap: 10
  },
  verComandosText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF"
  },
  autorizacionContainer: {
    marginTop: 10
  },
  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#007AFF",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    gap: 10
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 8,
    gap: 10
  },
  buttonSuccess: {
    backgroundColor: "#28a745"
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold"
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
  historialContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  historialTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15
  },
  historialItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0"
  },
  historialIcono: {
    fontSize: 24,
    marginRight: 12
  },
  historialInfo: {
    flex: 1
  },
  historialComando: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2
  },
  historialFecha: {
    fontSize: 12,
    color: "#999"
  },
  historialMonto: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#007AFF"
  },
  infoContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fff",
    padding: 15,
    marginTop: 20,
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
  comandosList: {
    paddingHorizontal: 20
  },
  comandoItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0"
  },
  comandoItemIcono: {
    fontSize: 32,
    marginRight: 15
  },
  comandoItemInfo: {
    flex: 1
  },
  comandoItemNombre: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 3
  },
  comandoItemDescripcion: {
    fontSize: 12,
    color: "#666",
    marginBottom: 3
  },
  comandoItemPatron: {
    fontSize: 11,
    color: "#007AFF",
    fontStyle: "italic"
  },
  comandoItemMonto: {
    alignItems: "flex-end"
  },
  comandoItemMontoTexto: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#007AFF",
    marginBottom: 5
  }
});