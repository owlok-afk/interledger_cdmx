import React from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";

const PLATAFORMAS = [
  {
    id: 1,
    nombre: "StreamHub",
    icon: "play-circle",
    color: "#9147ff",
    descripcion: "Transmisiones en vivo",
  },
  {
    id: 2,
    nombre: "LiveCast",
    icon: "youtube-play",
    color: "#ff0000",
    descripcion: "Contenido en directo",
  },
  {
    id: 3,
    nombre: "GameStream",
    icon: "gamepad",
    color: "#00d9ff",
    descripcion: "Gaming y más",
  },
  {
    id: 4,
    nombre: "SocialLive",
    icon: "video-camera",
    color: "#ff6b6b",
    descripcion: "Streaming social",
  },
];

export default function StreamersListScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#68cb88" />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header Info */}
          <View style={styles.headerInfo}>
            <FontAwesome name="heart" size={40} color="#ff7a7f" />
            <Text style={styles.headerTitle}>Apoya a tus Streamers</Text>
            <Text style={styles.headerSubtitle}>
              Elige la plataforma y envía tu apoyo
            </Text>
          </View>

          {/* Plataformas */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Plataformas Disponibles</Text>

            {PLATAFORMAS.map((plataforma) => (
              <TouchableOpacity
                key={plataforma.id}
                style={styles.plataformaCard}
                onPress={() =>
                  navigation.navigate("Streaming", {
                    plataforma: plataforma.nombre,
                    color: plataforma.color,
                  })
                }
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.plataformaIcon,
                    { backgroundColor: plataforma.color + "20" },
                  ]}
                >
                  <FontAwesome
                    name={plataforma.icon}
                    size={32}
                    color={plataforma.color}
                  />
                </View>

                <View style={styles.plataformaInfo}>
                  <Text style={styles.plataformaNombre}>
                    {plataforma.nombre}
                  </Text>
                  <Text style={styles.plataformaDescripcion}>
                    {plataforma.descripcion}
                  </Text>
                </View>

                <FontAwesome name="chevron-right" size={20} color="#ccc" />
              </TouchableOpacity>
            ))}
          </View>

          {/* Stats Section */}
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Tus Donaciones</Text>

            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <FontAwesome name="heart" size={24} color="#ff7a7f" />
                <Text style={styles.statNumber}>23</Text>
                <Text style={styles.statLabel}>Donaciones</Text>
              </View>

              <View style={styles.statCard}>
                <FontAwesome name="dollar" size={24} color="#68cb88" />
                <Text style={styles.statNumber}>$1,250</Text>
                <Text style={styles.statLabel}>Total donado</Text>
              </View>

              <View style={styles.statCard}>
                <FontAwesome name="users" size={24} color="#58c0c1" />
                <Text style={styles.statNumber}>8</Text>
                <Text style={styles.statLabel}>Streamers</Text>
              </View>
            </View>
          </View>

          {/* Info Footer */}
          <View style={styles.infoFooter}>
            <FontAwesome name="shield" size={20} color="#68cb88" />
            <Text style={styles.infoText}>
              Todas las donaciones son seguras y procesadas mediante Interledger
              Protocol
            </Text>
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>
      </SafeAreaView>
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
  headerInfo: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  plataformaCard: {
    flexDirection: "row",
    alignItems: "center",
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
  plataformaIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  plataformaInfo: {
    flex: 1,
  },
  plataformaNombre: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  plataformaDescripcion: {
    fontSize: 13,
    color: "#999",
  },
  statsSection: {
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
  },
  infoFooter: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#68cb8815",
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#666",
    marginLeft: 12,
    lineHeight: 18,
  },
});