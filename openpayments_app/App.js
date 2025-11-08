import React, { useState } from "react";
import { StyleSheet, Text, View, Button, ActivityIndicator, Linking, Alert } from "react-native";
import axios from "axios";

const API_URL = "http://192.168.37.51:4000";

export default function App() {
  const [loading, setLoading] = useState(false);
  const [grantUrl, setGrantUrl] = useState(null);

  const crearPago = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/pago`);
      setGrantUrl(res.data.url);
      Alert.alert("Pago generado", "Abre el enlace para autorizar el pago.");
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "No se pudo crear el pago. Verifica conexión o backend.");
    } finally {
      setLoading(false);
    }
  };

  const finalizarPago = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/finalizar-pago`);
      Alert.alert("Éxito", "Pago completado correctamente ✅");
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "No se pudo finalizar el pago.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>💸 Open Payments Demo</Text>

      {loading && <ActivityIndicator size="large" color="#007AFF" style={{ margin: 20 }} />}

      <Button title="Crear pago" onPress={crearPago} disabled={loading} />
      <View style={{ marginTop: 10 }}>
        <Button title="Finalizar pago" onPress={finalizarPago} disabled={loading} />
      </View>

      {grantUrl && (
        <View style={{ marginTop: 20 }}>
          <Button title="Abrir enlace de autorización" onPress={() => Linking.openURL(grantUrl)} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f2f2f2" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
});
