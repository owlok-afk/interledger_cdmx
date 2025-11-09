import React from "react";
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import axios from "axios";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// Pantallas
import TransferenciasScreen from "./screens/TransferenciasScreen";
import PagosQRScreen from "./screens/PagosQRScreen";
import DonarScreen from "./screens/DonarScreen";
import ProgramarScreen from "./screens/ProgramarScreen";
import AsistenteScreen from "./screens/AsistenteScreen";

const Stack = createNativeStackNavigator();
const API_URL = "http://192.168.1.229:4000";

function HomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>Bienvenido 👋</Text>
      </View>

      {/* Cuerpo */}
      <View style={styles.body}>
        {/* Fila 1 */}
        <View style={styles.row}>
          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("Transferencias")}>
            <FontAwesome name="exchange" size={24} color="#007AFF" />
            <Text style={styles.buttonText}>Transferencias</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("PagosQR")}>
            <FontAwesome name="qrcode" size={24} color="#007AFF" />
            <Text style={styles.buttonText}>Pagos con QR</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("Donar")}>
            <FontAwesome name="heart" size={24} color="#007AFF" />
            <Text style={styles.buttonText}>Donar</Text>
          </TouchableOpacity>
        </View>

        {/* Fila 2 */}
        <View style={styles.row}>
          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("Programar")}>
            <FontAwesome name="clock-o" size={24} color="#007AFF" />
            <Text style={styles.buttonText}>Programar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("Asistente")}>
            <FontAwesome name="microphone" size={24} color="#007AFF" />
            <Text style={styles.buttonText}>Asistente</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerButton}>
          <FontAwesome name="home" size={26} color="#007AFF" />
          <Text style={styles.footerText}>Inicio</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.footerButton}>
          <FontAwesome name="bar-chart" size={26} color="#007AFF" />
          <Text style={styles.footerText}>Movimientos</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Inicio" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Transferencias" component={TransferenciasScreen} />
        <Stack.Screen name="PagosQR" component={PagosQRScreen} />
        <Stack.Screen name="Donar" component={DonarScreen} />
        <Stack.Screen name="Programar" component={ProgramarScreen} />
        <Stack.Screen name="Asistente" component={AsistenteScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f2f2" },
  header: { backgroundColor: "#007AFF", padding: 20, alignItems: "center" },
  headerText: { color: "#fff", fontSize: 22, fontWeight: "bold" },
  body: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  row: { flexDirection: "row", justifyContent: "space-between", width: "100%", marginVertical: 10 },
  button: {
    flex: 1,
    backgroundColor: "#fff",
    marginHorizontal: 6,
    paddingVertical: 18,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
  },
  buttonText: { fontSize: 14, marginTop: 6, color: "#333", fontWeight: "500" },
  footer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 15,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#ddd",
  },
  footerButton: { alignItems: "center" },
  footerText: { fontSize: 13, color: "#007AFF", marginTop: 4 },
});
