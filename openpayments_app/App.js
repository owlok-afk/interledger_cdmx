import React, { useState } from "react";
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  TextInput,
  SafeAreaView,
  StatusBar,
  ScrollView
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// Pantallas existentes
import TransferenciasScreen from "./screens/TransferenciasScreen";
import PagosQRScreen from "./screens/PagosQRScreen";
import DonarScreen from "./screens/DonarScreen";
import ProgramarScreen from "./screens/ProgramarScreen";
import AsistenteScreen from "./screens/AsistenteScreen";

// Nuevas pantallas de Streamers
import StreamersListScreen from "./screens/StreamersListScreen";
import StreamingScreen from "./screens/StreamingScreen";
import DonarStreamerScreen from "./screens/DonarStreamerScreen";

const Stack = createNativeStackNavigator();
const API_URL = "http://192.168.1.229:4000";

// Credenciales hardcodeadas
const CREDENTIALS = {
  username: "alex_openpayments12",
  password: "alex1010A_"
};

// Pantalla de Login
function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    setError("");
    setLoading(true);

    setTimeout(() => {
      if (username === CREDENTIALS.username && password === CREDENTIALS.password) {
        onLogin();
      } else {
        setError("Usuario o contraseña incorrectos");
      }
      setLoading(false);
    }, 800);
  };

  return (
    <View style={styles.loginContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#68cb88" />
      <SafeAreaView style={styles.loginSafeArea}>
        <ScrollView 
          contentContainerStyle={styles.loginScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo/Header */}
          <View style={styles.loginHeader}>
            <View style={styles.logoCircle}>
              <FontAwesome name="wallet" size={50} color="#fff" />
            </View>
            <Text style={styles.loginTitle}>OpenPayments</Text>
            <Text style={styles.loginSubtitle}>Pagos seguros y rápidos</Text>
          </View>

          {/* Formulario */}
          <View style={styles.loginForm}>
            <View style={styles.inputContainer}>
              <View style={styles.inputIconContainer}>
                <FontAwesome name="user" size={20} color="#68cb88" />
              </View>
              <TextInput
                style={styles.loginInput}
                placeholder="Usuario"
                placeholderTextColor="#999"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputIconContainer}>
                <FontAwesome name="lock" size={20} color="#68cb88" />
              </View>
              <TextInput
                style={styles.loginInput}
                placeholder="Contraseña"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity 
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <FontAwesome 
                  name={showPassword ? "eye" : "eye-slash"} 
                  size={20} 
                  color="#999" 
                />
              </TouchableOpacity>
            </View>

            {error ? (
              <View style={styles.errorContainer}>
                <FontAwesome name="exclamation-circle" size={16} color="#ff7a7f" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity 
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <Text style={styles.loginButtonText}>Iniciando...</Text>
              ) : (
                <View style={styles.loginButtonContent}>
                  <FontAwesome name="sign-in" size={20} color="#fff" />
                  <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Credenciales de ayuda */}
            <View style={styles.helpContainer}>
              <Text style={styles.helpTitle}>💡 Credenciales de prueba:</Text>
              <Text style={styles.helpText}>Usuario: alex_openpayments12</Text>
              <Text style={styles.helpText}>Contraseña: alex1010A_</Text>
            </View>
          </View>

          <View style={styles.loginFooter}>
            <Text style={styles.loginFooterText}>© 2024 OpenPayments</Text>
            <Text style={styles.loginFooterSubtext}>Powered by Interledger Protocol</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// Pantalla Principal
function HomeScreen({ navigation, onLogout }) {
  const services = [
    {
      id: 1,
      name: "Transferencias",
      icon: "exchange",
      color: "#68cb88",
      screen: "Transferencias",
      description: "Envía dinero"
    },
    {
      id: 2,
      name: "Pagos QR",
      icon: "qrcode",
      color: "#ffa254",
      screen: "PagosQR",
      description: "Escanea y paga"
    },
    {
      id: 3,
      name: "Donar",
      icon: "heart",
      color: "#ff7a7f",
      screen: "Donar",
      description: "Ayuda a causas"
    },
    {
      id: 4,
      name: "Programar",
      icon: "clock-o",
      color: "#8c528c",
      screen: "Programar",
      description: "Pagos automáticos"
    },
    {
      id: 5,
      name: "Asistente",
      icon: "microphone",
      color: "#58c0c1",
      screen: "Asistente",
      description: "Paga por voz"
    },
    {
      id: 6,
      name: "Streamers",
      icon: "video-camera",
      color: "#9147ff",
      screen: "StreamersList",
      description: "Apoya creadores"
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#68cb88" />
      
      {/* Header */}
      <View style={styles.header}>
        <SafeAreaView>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerGreeting}>Hola, Alex 👋</Text>
              <Text style={styles.headerSubtitle}>¿Qué deseas hacer hoy?</Text>
            </View>
            <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
              <FontAwesome name="sign-out" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Balance Card */}
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Saldo disponible</Text>
            <Text style={styles.balanceAmount}>$12,450.00</Text>
            <Text style={styles.balanceCurrency}>MXN</Text>
          </View>
        </SafeAreaView>
      </View>

      {/* Servicios */}
      <ScrollView 
        style={styles.servicesContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.servicesGrid}>
          {services.map((service) => (
            <TouchableOpacity
              key={service.id}
              style={styles.serviceCard}
              onPress={() => navigation.navigate(service.screen)}
              activeOpacity={0.7}
            >
              <View style={[styles.serviceIconContainer, { backgroundColor: service.color + '20' }]}>
                <FontAwesome name={service.icon} size={32} color={service.color} />
              </View>
              <Text style={styles.serviceName}>{service.name}</Text>
              <Text style={styles.serviceDescription}>{service.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Actividad reciente */}
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Actividad Reciente</Text>
          
          <View style={styles.activityCard}>
            <View style={[styles.activityIcon, { backgroundColor: '#68cb8820' }]}>
              <FontAwesome name="arrow-up" size={20} color="#68cb88" />
            </View>
            <View style={styles.activityInfo}>
              <Text style={styles.activityTitle}>Transferencia enviada</Text>
              <Text style={styles.activityDate}>Hoy, 10:30 AM</Text>
            </View>
            <Text style={styles.activityAmount}>-$500.00</Text>
          </View>

          <View style={styles.activityCard}>
            <View style={[styles.activityIcon, { backgroundColor: '#ff7a7f20' }]}>
              <FontAwesome name="heart" size={20} color="#ff7a7f" />
            </View>
            <View style={styles.activityInfo}>
              <Text style={styles.activityTitle}>Donación a Cruz Roja</Text>
              <Text style={styles.activityDate}>Ayer, 3:15 PM</Text>
            </View>
            <Text style={styles.activityAmount}>-$200.00</Text>
          </View>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <FontAwesome name="home" size={24} color="#68cb88" />
          <Text style={[styles.navText, { color: '#68cb88' }]}>Inicio</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <FontAwesome name="list" size={24} color="#999" />
          <Text style={styles.navText}>Movimientos</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <FontAwesome name="bell" size={24} color="#999" />
          <Text style={styles.navText}>Alertas</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <FontAwesome name="user" size={24} color="#999" />
          <Text style={styles.navText}>Perfil</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// App Principal con estado de login
export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  if (!isLoggedIn) {
    return <LoginScreen onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#68cb88',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen 
          name="Inicio" 
          options={{ headerShown: false }}
        >
          {(props) => <HomeScreen {...props} onLogout={() => setIsLoggedIn(false)} />}
        </Stack.Screen>
        
        {/* Pantallas originales */}
        <Stack.Screen name="Transferencias" component={TransferenciasScreen} />
        <Stack.Screen name="PagosQR" component={PagosQRScreen} options={{ title: "Pagos con QR" }} />
        <Stack.Screen name="Donar" component={DonarScreen} />
        <Stack.Screen name="Programar" component={ProgramarScreen} options={{ title: "Programar Pagos" }} />
        <Stack.Screen name="Asistente" component={AsistenteScreen} options={{ title: "Asistente de Voz" }} />
        
        {/* Nuevas pantallas de Streamers */}
        <Stack.Screen 
          name="StreamersList" 
          component={StreamersListScreen} 
          options={{ title: "Apoyo a Streamers" }} 
        />
        <Stack.Screen 
          name="Streaming" 
          component={StreamingScreen} 
          options={{ title: "Streamers" }} 
        />
        <Stack.Screen 
          name="DonarStreamer" 
          component={DonarStreamerScreen} 
          options={{ title: "Donar a Streamer" }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  // ============ LOGIN STYLES ============
  loginContainer: {
    flex: 1,
    backgroundColor: '#68cb88',
  },
  loginSafeArea: {
    flex: 1,
  },
  loginScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  loginHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loginTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  loginSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  loginForm: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  inputIconContainer: {
    padding: 16,
  },
  loginInput: {
    flex: 1,
    paddingVertical: 16,
    paddingRight: 16,
    fontSize: 16,
    color: '#333',
  },
  eyeIcon: {
    padding: 16,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff0f0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#ff7a7f',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  loginButton: {
    backgroundColor: '#58c0c1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#58c0c1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  helpContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#68cb88',
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  loginFooter: {
    alignItems: 'center',
    marginTop: 40,
  },
  loginFooterText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontWeight: '600',
  },
  loginFooterSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginTop: 4,
  },

  // ============ HOME STYLES ============
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#68cb88',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerGreeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  logoutButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  balanceCurrency: {
    fontSize: 16,
    color: '#999',
    fontWeight: '600',
  },
  servicesContainer: {
    flex: 1,
    paddingTop: 20,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 12,
  },
  serviceCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 12,
  },
  serviceIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
    textAlign: 'center',
  },
  serviceDescription: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  recentSection: {
    padding: 20,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  activityIcon: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  activityDate: {
    fontSize: 13,
    color: '#999',
  },
  activityAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 10,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  navText: {
    fontSize: 11,
    marginTop: 4,
    color: '#999',
    fontWeight: '500',
  },
});