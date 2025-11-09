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
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";

const STREAMERS = [
  {
    id: 1,
    nombre: "ElGamerPro",
    categoria: "Gaming",
    seguidores: "125K",
    online: true,
    avatar: "gamepad",
    color: "#9147ff",
    descripcion: "Contenido de Valorant y League of Legends",
  },
  {
    id: 2,
    nombre: "TechMaster",
    categoria: "Tecnología",
    seguidores: "89K",
    online: true,
    avatar: "laptop",
    color: "#00d9ff",
    descripcion: "Reviews y tutoriales de tecnología",
  },
  {
    id: 3,
    nombre: "MusicVibes",
    categoria: "Música",
    seguidores: "210K",
    online: false,
    avatar: "music",
    color: "#ff6b6b",
    descripcion: "DJ sets y producción musical en vivo",
  },
  {
    id: 4,
    nombre: "ChefEnVivo",
    categoria: "Cocina",
    seguidores: "67K",
    online: true,
    avatar: "cutlery",
    color: "#ffa254",
    descripcion: "Recetas y cocina internacional",
  },
  {
    id: 5,
    nombre: "FitnessQueen",
    categoria: "Fitness",
    seguidores: "156K",
    online: false,
    avatar: "heart",
    color: "#ff7a7f",
    descripcion: "Rutinas de ejercicio y vida saludable",
  },
  {
    id: 6,
    nombre: "ArtCreator",
    categoria: "Arte",
    seguidores: "93K",
    online: true,
    avatar: "paint-brush",
    color: "#8c528c",
    descripcion: "Ilustración digital y diseño",
  },
  {
    id: 7,
    nombre: "ComedyKing",
    categoria: "Comedia",
    seguidores: "180K",
    online: true,
    avatar: "smile-o",
    color: "#68cb88",
    descripcion: "Stand-up y contenido de humor",
  },
  {
    id: 8,
    nombre: "EduStream",
    categoria: "Educación",
    seguidores: "112K",
    online: false,
    avatar: "book",
    color: "#58c0c1",
    descripcion: "Matemáticas y ciencias explicadas",
  },
  {
    id: 9,
    nombre: "TravelVlog",
    categoria: "Viajes",
    seguidores: "145K",
    online: true,
    avatar: "plane",
    color: "#ffa254",
    descripcion: "Aventuras alrededor del mundo",
  },
  {
    id: 10,
    nombre: "PetLover",
    categoria: "Mascotas",
    seguidores: "78K",
    online: false,
    avatar: "paw",
    color: "#ff7a7f",
    descripcion: "Cuidado y entrenamiento de mascotas",
  },
];

export default function StreamingScreen({ navigation, route }) {
  const { plataforma, color } = route.params;
  const [searchQuery, setSearchQuery] = useState("");

  const filteredStreamers = STREAMERS.filter((streamer) =>
    streamer.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    streamer.categoria.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#68cb88" />
      <SafeAreaView style={styles.safeArea}>
        {/* Platform Header */}
        <View style={[styles.platformHeader, { backgroundColor: color + "15" }]}>
          <Text style={styles.platformName}>{plataforma}</Text>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>
              {STREAMERS.filter((s) => s.online).length} en vivo
            </Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <FontAwesome name="search" size={18} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar streamer o categoría..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <FontAwesome name="times-circle" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Streamers List */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={styles.sectionTitle}>
            Streamers Disponibles ({filteredStreamers.length})
          </Text>

          {filteredStreamers.map((streamer) => (
            <TouchableOpacity
              key={streamer.id}
              style={styles.streamerCard}
              onPress={() =>
                navigation.navigate("DonarStreamer", {
                  streamer,
                  plataforma,
                })
              }
              activeOpacity={0.7}
            >
              {/* Online Indicator */}
              {streamer.online && <View style={styles.onlineBadge} />}

              <View
                style={[
                  styles.streamerAvatar,
                  { backgroundColor: streamer.color + "20" },
                ]}
              >
                <FontAwesome
                  name={streamer.avatar}
                  size={28}
                  color={streamer.color}
                />
              </View>

              <View style={styles.streamerInfo}>
                <View style={styles.streamerHeader}>
                  <Text style={styles.streamerNombre}>{streamer.nombre}</Text>
                  {streamer.online && (
                    <View style={styles.liveTag}>
                      <Text style={styles.liveTagText}>LIVE</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.streamerCategoria}>{streamer.categoria}</Text>
                <Text style={styles.streamerDescripcion}>
                  {streamer.descripcion}
                </Text>

                <View style={styles.streamerFooter}>
                  <View style={styles.followersContainer}>
                    <FontAwesome name="users" size={14} color="#999" />
                    <Text style={styles.followersText}>
                      {streamer.seguidores} seguidores
                    </Text>
                  </View>

                  <View style={styles.donateButton}>
                    <FontAwesome name="heart" size={14} color="#ff7a7f" />
                    <Text style={styles.donateButtonText}>Donar</Text>
                  </View>
                </View>
              </View>

              <FontAwesome name="chevron-right" size={18} color="#ccc" />
            </TouchableOpacity>
          ))}

          {filteredStreamers.length === 0 && (
            <View style={styles.emptyState}>
              <FontAwesome name="search" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No se encontraron streamers</Text>
              <Text style={styles.emptySubtext}>
                Intenta con otra búsqueda
              </Text>
            </View>
          )}

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
  platformHeader: {
    padding: 16,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  platformName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ff4444",
    marginRight: 6,
  },
  liveText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "600",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: "#333",
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  streamerCard: {
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
    position: "relative",
  },
  onlineBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#4caf50",
    borderWidth: 2,
    borderColor: "#fff",
    zIndex: 1,
  },
  streamerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  streamerInfo: {
    flex: 1,
  },
  streamerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  streamerNombre: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginRight: 8,
  },
  liveTag: {
    backgroundColor: "#ff4444",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveTagText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  streamerCategoria: {
    fontSize: 13,
    color: "#68cb88",
    fontWeight: "600",
    marginBottom: 4,
  },
  streamerDescripcion: {
    fontSize: 12,
    color: "#999",
    marginBottom: 8,
  },
  streamerFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  followersContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  followersText: {
    fontSize: 12,
    color: "#999",
    marginLeft: 6,
  },
  donateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ff7a7f15",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  donateButtonText: {
    fontSize: 12,
    color: "#ff7a7f",
    fontWeight: "600",
    marginLeft: 6,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
  },
});