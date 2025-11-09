import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  RefreshControl,
  Platform,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import axios from "axios";
import * as Notifications from 'expo-notifications';

const API_URL = "http://192.168.1.229:4000";

// Utilidad para detectar si estamos en web
const isWeb = Platform.OS === 'web';

// Alert compatible con web
const AlertWeb = {
  alert: (title, message, buttons = [], options = {}) => {
    if (isWeb) {
      // En web, usar confirm/alert del navegador
      if (buttons.length === 0) {
        window.alert(`${title}\n\n${message}`);
      } else if (buttons.length === 1) {
        window.alert(`${title}\n\n${message}`);
        if (buttons[0].onPress) buttons[0].onPress();
      } else {
        const confirmed = window.confirm(`${title}\n\n${message}`);
        if (confirmed && buttons[1].onPress) {
          buttons[1].onPress();
        } else if (!confirmed && buttons[0].onPress) {
          buttons[0].onPress();
        }
      }
    } else {
      // En mobile usar Alert nativo
      const Alert = require('react-native').Alert;
      Alert.alert(title, message, buttons, options);
    }
  }
};

// Linking compatible con web
const LinkingWeb = {
  openURL: async (url) => {
    if (isWeb) {
      window.open(url, '_blank');
      return true;
    } else {
      const Linking = require('react-native').Linking;
      return await Linking.openURL(url);
    }
  },
  canOpenURL: async (url) => {
    if (isWeb) {
      return true; // En web siempre podemos abrir URLs
    } else {
      const Linking = require('react-native').Linking;
      return await Linking.canOpenURL(url);
    }
  }
};

// Configurar notificaciones solo si no estamos en web
if (!isWeb) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export default function ProgramarScreen() {
  const [destinatario, setDestinatario] = useState("");
  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [loading, setLoading] = useState(false);
  const [tareas, setTareas] = useState([]);
  const [notificaciones, setNotificaciones] = useState([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    // Solo configurar notificaciones si no estamos en web
    if (!isWeb) {
      solicitarPermisos();
      
      notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
        console.log('📥 Notificación recibida:', notification);
        cargarDatos();
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('👆 Notificación tocada:', response);
        const data = response.notification.request.content.data;
        
        if (data.tipo === 'pago_pendiente' && data.tareaId) {
          cargarDatos().then(() => {
            const notif = notificaciones.find(n => n.tareaId === data.tareaId);
            if (notif) {
              setTimeout(() => mostrarNotificacionPago(notif), 500);
            }
          });
        }
      });
    }

    cargarDatos();
    const interval = setInterval(cargarDatos, 30000);
    
    return () => {
      clearInterval(interval);
      if (!isWeb && notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (!isWeb && responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  async function solicitarPermisos() {
    if (isWeb) {
      console.log('⚠️ Notificaciones no disponibles en web');
      return false;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        AlertWeb.alert(
          'Permisos requeridos', 
          '⚠️ Las notificaciones están deshabilitadas. La app verificará pagos mientras esté abierta.'
        );
        return false;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('pagos-programados', {
          name: 'Pagos Programados',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
        });
      }

      console.log('✅ Permisos de notificaciones concedidos');
      return true;
      
    } catch (error) {
      console.error('Error solicitando permisos:', error);
      return false;
    }
  }

  const cargarDatos = async () => {
    try {
      setRefreshing(true);
      
      const resT = await axios.get(`${API_URL}/tareas-programadas`);
      setTareas(resT.data);
      
      const resN = await axios.get(`${API_URL}/notificaciones-pendientes`);
      setNotificaciones(resN.data);
      
    } catch (err) {
      console.error("Error cargando datos:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const programarNotificacionLocal = async (tarea) => {
    if (isWeb) {
      console.log('⚠️ Notificaciones locales no disponibles en web');
      return;
    }

    try {
      const fechaPago = new Date(tarea.fecha);
      const segundosHastaPago = Math.floor((fechaPago - Date.now()) / 1000);
      
      if (segundosHastaPago <= 0) {
        console.log('⚠️ La fecha de pago ya pasó');
        return;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: "🔔 Pago Programado Listo",
          body: `${tarea.descripcion}\n$${tarea.monto} MXN`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: {
            tipo: 'pago_pendiente',
            tareaId: tarea.id,
            monto: tarea.monto,
            descripcion: tarea.descripcion,
          },
        },
        trigger: {
          seconds: segundosHastaPago,
          channelId: 'pagos-programados',
        },
      });

      console.log(`✅ Notificación local programada: ${notificationId} en ${segundosHastaPago}s`);
      return notificationId;
      
    } catch (error) {
      console.error('Error programando notificación local:', error);
    }
  };

  const mostrarNotificacionPago = (notif) => {
    AlertWeb.alert(
      "🔔 Pago Programado Listo",
      `${notif.descripcion}\n\nMonto: $${notif.monto} MXN\nDestinatario: ${notif.destinatario.split("/").pop()}\n\n¿Deseas aprobar este pago?`,
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Aprobar Pago",
          onPress: () => abrirAprobacion(notif),
        },
      ]
    );
  };

  const abrirAprobacion = async (notif) => {
    try {
      console.log('🔗 Abriendo URL de aprobación:', notif.url);
      
      await LinkingWeb.openURL(notif.url);
      
      AlertWeb.alert(
        "Instrucciones",
        "1. Aprueba el pago en el navegador\n2. Regresa a esta app\n3. Presiona 'Finalizar Pago'",
        [{ text: "Entendido" }]
      );
    } catch (err) {
      console.error("Error abriendo URL:", err);
      AlertWeb.alert("Error", "No se pudo abrir la URL de aprobación");
    }
  };

  const finalizarPago = async (tareaId) => {
    console.log('🔄 Iniciando finalización de pago para tarea:', tareaId);
    
    AlertWeb.alert(
      "Confirmar",
      "¿Ya aprobaste el pago en el navegador?",
      [
        {
          text: "No",
          style: "cancel",
          onPress: () => console.log('❌ Usuario canceló finalización')
        },
        {
          text: "Sí, finalizar",
          onPress: async () => {
            try {
              console.log('✅ Usuario confirmó, ejecutando finalización...');
              setLoading(true);
              
              const res = await axios.post(`${API_URL}/finalizar-pago-programado/${tareaId}`);
              
              console.log('✅ Respuesta del servidor:', res.data);
              
              AlertWeb.alert("✅ Pago Completado", res.data.message);
              await cargarDatos();
              
            } catch (err) {
              console.error("❌ Error finalizando pago:", err);
              console.error("Detalles del error:", err.response?.data);
              AlertWeb.alert("❌ Error", err.response?.data?.error || err.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const programarPago = async () => {
    if (!destinatario || !monto || !fecha || !hora) {
      AlertWeb.alert("❌ Error", "Por favor completa todos los campos");
      return;
    }

    setLoading(true);
    try {
      const fechaCompleta = `${fecha} ${hora}`;
      
      const res = await axios.post(`${API_URL}/programar-pago`, {
        destinatario,
        monto: parseFloat(monto),
        fecha: fechaCompleta,
        descripcion,
      });

      // Programar notificación local solo si no estamos en web
      if (!isWeb) {
        await programarNotificacionLocal(res.data.tarea);
      }

      const mensaje = isWeb 
        ? "Pago programado correctamente.\n\n⚠️ En modo web, debes revisar manualmente cuando sea la hora del pago."
        : "Pago programado correctamente.\n\n📱 Recibirás una notificación local cuando sea hora de aprobar el pago.";

      AlertWeb.alert("✅ Éxito", mensaje);
      
      setDestinatario("");
      setMonto("");
      setDescripcion("");
      setFecha("");
      setHora("");
      setMostrarFormulario(false);
      await cargarDatos();
      
    } catch (err) {
      console.error("Error:", err.response?.data);
      const errorMsg = err.response?.data?.error || err.message;
      const ejemplos = err.response?.data?.ejemplos;
      
      AlertWeb.alert(
        "❌ Error", 
        errorMsg + (ejemplos ? `\n\nEjemplos:\n${ejemplos.join('\n')}` : "")
      );
    } finally {
      setLoading(false);
    }
  };

  const autocompletarFecha = async (minutos) => {
    try {
      const horaRes = await axios.get(`${API_URL}/hora-servidor`);
      const ahora = new Date(horaRes.data.timestamp);
      ahora.setMinutes(ahora.getMinutes() + minutos);
      
      const year = ahora.getFullYear();
      const month = String(ahora.getMonth() + 1).padStart(2, '0');
      const day = String(ahora.getDate()).padStart(2, '0');
      const hours = String(ahora.getHours()).padStart(2, '0');
      const mins = String(ahora.getMinutes()).padStart(2, '0');
      
      setFecha(`${year}-${month}-${day}`);
      setHora(`${hours}:${mins}`);
    } catch (err) {
      console.error("Error obteniendo hora:", err);
    }
  };

  const cancelarTarea = async (id) => {
    AlertWeb.alert(
      "⚠ Confirmar",
      "¿Estás seguro de cancelar esta tarea?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Sí, cancelar",
          onPress: async () => {
            try {
              await axios.delete(`${API_URL}/tareas-programadas/${id}`);
              AlertWeb.alert("✅", "Tarea cancelada");
              await cargarDatos();
            } catch (err) {
              console.error("Error cancelando:", err);
              AlertWeb.alert("❌ Error", err.response?.data?.error || err.message);
            }
          },
        },
      ]
    );
  };

  const obtenerIconoEstado = (estado) => {
    switch (estado) {
      case "pendiente":
        return { icono: "clock-o", color: "#FFA500" };
      case "esperando_aprobacion":
        return { icono: "hand-paper-o", color: "#2196F3" };
      case "completado":
        return { icono: "check-circle", color: "#4CAF50" };
      case "error":
        return { icono: "exclamation-circle", color: "#F44336" };
      default:
        return { icono: "question-circle", color: "#999" };
    }
  };

  const formatearFecha = (fechaISO) => {
    const fecha = new Date(fechaISO);
    return fecha.toLocaleString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const obtenerTextoEstado = (estado) => {
    switch (estado) {
      case "pendiente":
        return "Programado";
      case "esperando_aprobacion":
        return "Esperando aprobación";
      case "completado":
        return "Completado";
      case "error":
        return "Error";
      default:
        return estado;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pagos Programados</Text>
        <View style={styles.headerButtons}>
          {notificaciones.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{notificaciones.length}</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setMostrarFormulario(true)}
          >
            <FontAwesome name="plus" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Banner informativo */}
      <View style={styles.infoBanner}>
        <FontAwesome name="info-circle" size={16} color="#1976D2" />
        <Text style={styles.infoText}>
          {isWeb 
            ? "🌐 Modo Web: Revisa manualmente los pagos programados" 
            : "📱 Usando notificaciones locales. Mantén la app instalada para recibir alertas."}
        </Text>
      </View>

      {/* Notificaciones urgentes */}
      {notificaciones.length > 0 && (
        <View style={styles.notificationBanner}>
          <FontAwesome name="bell" size={20} color="#fff" />
          <Text style={styles.notificationText}>
            {notificaciones.length} pago(s) esperando aprobación
          </Text>
          <TouchableOpacity 
            onPress={() => mostrarNotificacionPago(notificaciones[0])}
            style={styles.notificationButton}
          >
            <Text style={styles.notificationButtonText}>Ver</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Lista de tareas */}
      <ScrollView 
        style={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={cargarDatos} />
        }
      >
        {tareas.length === 0 ? (
          <View style={styles.emptyState}>
            <FontAwesome name="calendar-o" size={60} color="#ccc" />
            <Text style={styles.emptyText}>No hay pagos programados</Text>
            <Text style={styles.emptySubtext}>
              Toca el botón + para crear uno
            </Text>
          </View>
        ) : (
          tareas.map((tarea) => {
            const { icono, color } = obtenerIconoEstado(tarea.estado);
            return (
              <View key={tarea.id} style={styles.tareaCard}>
                <View style={styles.tareaHeader}>
                  <FontAwesome name={icono} size={20} color={color} />
                  <Text style={[styles.tareaEstado, { color }]}>
                    {obtenerTextoEstado(tarea.estado)}
                  </Text>
                </View>

                <Text style={styles.tareaDescripcion}>
                  {tarea.descripcion || "Pago programado"}
                </Text>

                <View style={styles.tareaDetails}>
                  <View style={styles.tareaRow}>
                    <FontAwesome name="money" size={16} color="#666" />
                    <Text style={styles.tareaText}>
                      ${tarea.monto.toFixed(2)} MXN
                    </Text>
                  </View>

                  <View style={styles.tareaRow}>
                    <FontAwesome name="calendar" size={16} color="#666" />
                    <Text style={styles.tareaText}>
                      {formatearFecha(tarea.fecha)}
                    </Text>
                  </View>

                  <View style={styles.tareaRow}>
                    <FontAwesome name="user" size={16} color="#666" />
                    <Text style={styles.tareaText} numberOfLines={1}>
                      {tarea.destinatario.split("/").pop()}
                    </Text>
                  </View>
                </View>

                {tarea.estado === "pendiente" && (
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => cancelarTarea(tarea.id)}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                )}

                {tarea.estado === "esperando_aprobacion" && (
                  <View>
                    <TouchableOpacity
                      style={styles.approveButton}
                      onPress={() => {
                        const notif = notificaciones.find(n => n.tareaId === tarea.id);
                        if (notif) abrirAprobacion(notif);
                      }}
                      disabled={loading}
                    >
                      <FontAwesome name="external-link" size={16} color="#fff" />
                      <Text style={styles.approveButtonText}>Aprobar en Navegador</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.finalizeButton, loading && styles.buttonDisabled]}
                      onPress={() => {
                        console.log('👆 Botón Finalizar Pago presionado');
                        finalizarPago(tarea.id);
                      }}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <>
                          <FontAwesome name="check" size={16} color="#fff" />
                          <Text style={styles.finalizeButtonText}>Finalizar Pago</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Modal de formulario */}
      <Modal
        visible={mostrarFormulario}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Programar Pago</Text>
              <TouchableOpacity onPress={() => setMostrarFormulario(false)}>
                <FontAwesome name="times" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <Text style={styles.label}>Descripción</Text>
              <TextInput
                placeholder="Ej: Pago a Netflix"
                style={styles.input}
                value={descripcion}
                onChangeText={setDescripcion}
              />

              <Text style={styles.label}>Wallet destinatario</Text>
              <TextInput
                placeholder="https://ilp.interledger-test.dev/..."
                style={styles.input}
                value={destinatario}
                onChangeText={setDestinatario}
              />

              <Text style={styles.label}>Monto (MXN)</Text>
              <TextInput
                placeholder="100.00"
                style={styles.input}
                keyboardType="decimal-pad"
                value={monto}
                onChangeText={setMonto}
              />

              <Text style={styles.label}>Fecha (YYYY-MM-DD)</Text>
              <TextInput
                placeholder="2025-11-09"
                style={styles.input}
                value={fecha}
                onChangeText={setFecha}
              />

              <Text style={styles.label}>Hora (HH:mm)</Text>
              <TextInput
                placeholder="14:30"
                style={styles.input}
                value={hora}
                onChangeText={setHora}
              />

              <Text style={styles.quickLabel}>Atajos rápidos:</Text>
              <View style={styles.quickButtonsRow}>
                <TouchableOpacity 
                  style={styles.quickButton}
                  onPress={() => autocompletarFecha(2)}
                >
                  <Text style={styles.quickButtonText}>+2 min</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.quickButton}
                  onPress={() => autocompletarFecha(5)}
                >
                  <Text style={styles.quickButtonText}>+5 min</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.quickButton}
                  onPress={() => autocompletarFecha(60)}
                >
                  <Text style={styles.quickButtonText}>+1 hora</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.infoBox}>
                <FontAwesome name="bell" size={16} color="#2196F3" />
                <Text style={styles.infoBoxText}>
                  {isWeb 
                    ? "🌐 En modo web, debes revisar manualmente cuando sea la hora del pago."
                    : "📱 Recibirás una notificación local cuando sea hora de aprobar el pago.\n\n⚠️ Las notificaciones locales funcionan mientras la app esté instalada."}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.submitButton, loading && styles.buttonDisabled]}
                onPress={programarPago}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    Programar Pago
                  </Text>
                )}
              </TouchableOpacity>
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
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#007AFF",
    padding: 20,
    paddingTop: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  badge: {
    backgroundColor: "#F44336",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    top: -5,
    right: 35,
    zIndex: 1,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  addButton: {
    backgroundColor: "#0056b3",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  infoBanner: {
    backgroundColor: "#E3F2FD",
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 8,
  },
  infoText: {
    flex: 1,
    color: "#1976D2",
    fontSize: 12,
  },
  notificationBanner: {
    backgroundColor: "#FF9800",
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    gap: 10,
  },
  notificationText: {
    flex: 1,
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  notificationButton: {
    backgroundColor: "#fff",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  notificationButtonText: {
    color: "#FF9800",
    fontWeight: "bold",
    fontSize: 13,
  },
  listContainer: {
    flex: 1,
    padding: 15,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: "#666",
    marginTop: 15,
    fontWeight: "500",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 5,
  },
  tareaCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  tareaHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  tareaEstado: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "600",
  },
  tareaDescripcion: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  tareaDetails: {
    marginBottom: 12,
  },
  tareaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  tareaText: {
    marginLeft: 10,
    fontSize: 14,
    color: "#666",
    flex: 1,
  },
  cancelButton: {
    backgroundColor: "#F44336",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  approveButton: {
    backgroundColor: "#2196F3",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 8,
  },
  approveButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  finalizeButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  finalizeButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 8,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  submitButton: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 10,
  },
  submitButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  quickLabel: {
    fontSize: 13,
    color: "#666",
    marginTop: 10,
    marginBottom: 8,
  },
  quickButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  quickButton: {
    flex: 1,
    backgroundColor: "#E3F2FD",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "#2196F3",
  },
  quickButtonText: {
    color: "#2196F3",
    fontWeight: "600",
    fontSize: 13,
  },
  infoBox: {
    backgroundColor: "#E3F2FD",
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 15,
    gap: 10,
  },
  infoBoxText: {
    flex: 1,
    color: "#1976D2",
    fontSize: 13,
    lineHeight: 18,
  },
});