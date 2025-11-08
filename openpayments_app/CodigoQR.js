import React, { useState } from "react";
import { StyleSheet, Text, View, Button, ActivityIndicator, Linking, Alert, ScrollView } from "react-native";
import axios from "axios";

const API_URL = "http://10.215.89.150:4000"; // Reemplaza TU_IP_LOCAL por tu IP en la red

export default function App() {
  const [loading, setLoading] = useState(false);
  const [grantUrl, setGrantUrl] = useState(null);

  // Crear pago normal
  const crearPago = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/pago`);
      if (!res.data.url) throw new Error("No se recibió URL de pago");
      setGrantUrl(res.data.url);
      Alert.alert("Pago generado", "Abre el enlace para autorizar el pago.", [
        { text: "Abrir enlace", onPress: () => Linking.openURL(res.data.url) },
      ]);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  // Finalizar pago
  const finalizarPago = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/finalizar-pago`);
      Alert.alert("Pago finalizado", "✅ Pago completado correctamente");
      setGrantUrl(null);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", err.response?.data?.error || "No se pudo finalizar el pago");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>💸 Open Payments</Text>

      {loading && <ActivityIndicator size="large" color="#007AFF" style={{ margin: 20 }} />}

      <View style={styles.buttonGroup}>
        <Button title="Crear pago normal" onPress={crearPago} disabled={loading} />
      </View>

      <View style={styles.buttonGroup}>
        <Button title="Generar QR" onPress={() => {
          // Navegar a pantalla Generar QR
          // Por ejemplo usando react-navigation o abrir otro componente modal
          Alert.alert("Navegar", "Se abrirá el apartado Generar QR");
        }} />
      </View>

      <View style={styles.buttonGroup}>
        <Button title="Escanear QR" onPress={() => {
          // Navegar a pantalla Escanear QR
          Alert.alert("Navegar", "Se abrirá el apartado Escanear QR");
        }} />
      </View>

      {grantUrl && (
        <View style={styles.buttonGroup}>
          <Button title="Abrir enlace de autorización" onPress={() => Linking.openURL(grantUrl)} />
          <View style={{ marginTop: 10 }}>
            <Button title="✅ Finalizar pago" onPress={finalizarPago} disabled={loading} />
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f2f2f2", padding: 20 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 30 },
  buttonGroup: { marginTop: 10, width: "100%" },
});
