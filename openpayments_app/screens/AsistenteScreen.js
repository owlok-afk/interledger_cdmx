import React, { useState, useEffect, useRef } from "react";

const API_URL = "http://192.168.1.229:4000";

// Comandos con información de pago real
const COMANDOS = [
  {
    id: "eduardo",
    patrones: ["eduardo", "transferir eduardo", "enviar eduardo", "pagar eduardo"],
    nombre: "Eduardo",
    wallet: "$ilp.interledger-test.dev/eduardo_99",
    monto: 100,
    icono: "👨",
    tipo: "transferencia"
  },
  {
    id: "streaming",
    patrones: ["streaming", "pagar streaming", "servicio streaming", "pago streaming"],
    nombre: "Servicio Streaming",
    wallet: "$ilp.interledger-test.dev/streaming_89",
    monto: 150,
    icono: "📺",
    tipo: "servicio"
  }
];

export default function AsistenteVozWeb() {
  const [escuchando, setEscuchando] = useState(false);
  const [textoReconocido, setTextoReconocido] = useState("");
  const [comandoDetectado, setComandoDetectado] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [historial, setHistorial] = useState([]);
  const [speechReady, setSpeechReady] = useState(false);
  const [parcial, setParcial] = useState("");
  const [error, setError] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [comandoPendiente, setComandoPendiente] = useState(null);
  
  // Estados para el proceso de pago
  const [procesandoPago, setProcesandoPago] = useState(false);
  const [grantUrl, setGrantUrl] = useState(null);
  const [esperandoAutorizacion, setEsperandoAutorizacion] = useState(false);
  const [pagoExitoso, setPagoExitoso] = useState(false);
  
  const recognitionRef = useRef(null);

  // Inicializar Web Speech API
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError("Web Speech API no disponible en este navegador. Intenta con Chrome o Safari.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-MX';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setEscuchando(true);
      setParcial("Escuchando...");
      setError("");
    };

    recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript;
      const isFinal = result.isFinal;

      if (isFinal) {
        setTextoReconocido(transcript);
        setParcial("");
        procesarComando(transcript);
      } else {
        setParcial(transcript);
      }
    };

    recognition.onerror = (event) => {
      setEscuchando(false);
      setParcial("");
      
      let mensaje = "Error al reconocer voz";
      if (event.error === 'no-speech') {
        mensaje = "No se detectó voz. Intenta de nuevo.";
      } else if (event.error === 'not-allowed') {
        mensaje = "Permiso de micrófono denegado. Habilita el micrófono en tu navegador.";
      } else if (event.error === 'network') {
        mensaje = "Error de red. Verifica tu conexión.";
      }
      
      setError(mensaje);
    };

    recognition.onend = () => {
      setEscuchando(false);
      setParcial("");
    };

    recognitionRef.current = recognition;
    setSpeechReady(true);

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const iniciarEscucha = () => {
    if (!speechReady || !recognitionRef.current) {
      setError("Reconocimiento de voz no disponible");
      return;
    }
    
    setParcial("");
    setTextoReconocido("");
    setComandoDetectado(null);
    setError("");
    
    try {
      recognitionRef.current.start();
    } catch (err) {
      if (err.name !== 'InvalidStateError') {
        setError("Error al iniciar reconocimiento");
      }
    }
  };

  const detenerEscucha = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const hablar = (texto) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(texto);
      utterance.lang = 'es-MX';
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const procesarComando = (texto) => {
    const textoNormalizado = texto.toLowerCase().trim();
    
    const comando = COMANDOS.find(cmd => 
      cmd.patrones.some(patron => textoNormalizado.includes(patron))
    );

    if (comando) {
      setComandoDetectado(comando);
      setComandoPendiente(comando);
      setShowConfirm(true);
      hablar(`Comando reconocido: ${comando.nombre}. Monto: ${comando.monto} pesos.`);
    } else {
      setError(`No se reconoció el comando: "${texto}"`);
      hablar("No entendí el comando. Intenta de nuevo o selecciona de la lista.");
    }
  };

  // Función para crear el pago usando Open Payments API
  const crearPago = async (comando) => {
    setProcesandoPago(true);
    setError("");
    
    try {
      hablar(`Iniciando pago de ${comando.monto} pesos a ${comando.nombre}`);
      
      console.log('📤 Enviando pago:', {
        monto: comando.monto,
        destinatario: comando.wallet,
        concepto: `Pago por voz - ${comando.nombre}`
      });
      
      const response = await fetch(`${API_URL}/pago-voz`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          monto: comando.monto,
          destinatario: comando.wallet,
          concepto: `Pago por voz - ${comando.nombre}`
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ Error del servidor:', errorData);
        throw new Error('Error al crear el pago');
      }

      const data = await response.json();
      console.log('✅ Respuesta del servidor:', data);
      
      setGrantUrl(data.url);
      setEsperandoAutorizacion(true);
      setShowConfirm(false);
      setProcesandoPago(false); // Importante: liberar el estado aquí
      
      hablar("Pago iniciado. Por favor autoriza la transacción en el enlace.");
      
    } catch (err) {
      console.error('Error creando pago:', err);
      setError("No se pudo crear el pago. Verifica tu conexión.");
      hablar("Error al crear el pago. Por favor intenta de nuevo.");
      setProcesandoPago(false);
    }
  };

  // Función para finalizar el pago
  const finalizarPago = async () => {
    setProcesandoPago(true);
    setError("");
    
    try {
      hablar("Finalizando pago");
      
      const response = await fetch(`${API_URL}/finalizar-pago`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Error al finalizar el pago');
      }

      const data = await response.json();
      
      // Agregar al historial
      const nuevoPago = {
        id: Date.now(),
        comando: comandoPendiente.nombre,
        monto: comandoPendiente.monto,
        wallet: comandoPendiente.wallet,
        fecha: new Date().toLocaleTimeString('es-MX', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        icono: comandoPendiente.icono
      };
      
      setHistorial(prev => [nuevoPago, ...prev.slice(0, 9)]);
      
      // Limpiar estados
      setPagoExitoso(true);
      setEsperandoAutorizacion(false);
      setGrantUrl(null);
      
      hablar(`Pago completado exitosamente. Se enviaron ${comandoPendiente.monto} pesos a ${comandoPendiente.nombre}`);
      
      // Reset después de 3 segundos
      setTimeout(() => {
        setPagoExitoso(false);
        setComandoDetectado(null);
        setComandoPendiente(null);
        setTextoReconocido("");
        setProcesandoPago(false);
      }, 3000);
      
    } catch (err) {
      console.error('Error finalizando pago:', err);
      setError("No se pudo finalizar el pago. Intenta de nuevo.");
      hablar("Error al finalizar el pago. Por favor intenta de nuevo.");
      setProcesandoPago(false);
    }
  };

  const confirmarPago = () => {
    if (!comandoPendiente) return;
    crearPago(comandoPendiente);
  };

  const cancelarPago = () => {
    setShowConfirm(false);
    setEsperandoAutorizacion(false);
    setGrantUrl(null);
    setComandoPendiente(null);
    setComandoDetectado(null);
    setProcesandoPago(false);
    hablar("Pago cancelado");
  };

  const seleccionarComando = (comando) => {
    setShowModal(false);
    setTextoReconocido(comando.patrones[0]);
    setComandoDetectado(comando);
    setComandoPendiente(comando);
    setShowConfirm(true);
  };

  const abrirAutorizacion = () => {
    if (grantUrl) {
      window.open(grantUrl, '_blank');
      hablar("Abriendo enlace de autorización. Cuando termines, regresa aquí para finalizar.");
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.headerTitle}>🎤 Asistente de Pagos por Voz</h1>
        <p style={styles.headerSubtitle}>
          {speechReady ? "Di un comando o selecciona de la lista" : "Inicializando..."}
        </p>
      </div>

      <div style={styles.content}>
        {/* Error */}
        {error && (
          <div style={styles.errorBox}>
            <span style={styles.errorIcon}>⚠️</span>
            <p style={styles.errorText}>{error}</p>
          </div>
        )}

        {/* Pago Exitoso */}
        {pagoExitoso && (
          <div style={styles.successBox}>
            <span style={styles.successIcon}>✅</span>
            <div>
              <p style={styles.successTitle}>¡Pago Completado!</p>
              <p style={styles.successText}>
                ${comandoPendiente?.monto} MXN enviados a {comandoPendiente?.nombre}
              </p>
            </div>
          </div>
        )}

        {/* Botón Micrófono */}
        <div style={styles.micContainer}>
          <button
            style={{
              ...styles.micButton,
              ...(escuchando ? styles.micButtonActive : {}),
              ...(!speechReady || procesandoPago ? styles.micButtonDisabled : {})
            }}
            onClick={escuchando ? detenerEscucha : iniciarEscucha}
            disabled={!speechReady || procesandoPago}
          >
            <span style={styles.micIcon}>
              {escuchando ? "⏹️" : "🎤"}
            </span>
          </button>
          <p style={styles.micText}>
            {!speechReady 
              ? "Inicializando..." 
              : procesandoPago
                ? "Procesando pago..."
                : escuchando 
                  ? "Escuchando... (toca para detener)" 
                  : "Toca para hablar"}
          </p>
        </div>

        {/* Texto Parcial */}
        {parcial && escuchando && (
          <div style={styles.parcialBox}>
            <p style={styles.parcialLabel}>Escuchando:</p>
            <p style={styles.parcialText}>{parcial}</p>
          </div>
        )}

        {/* Texto Reconocido Final */}
        {textoReconocido && !escuchando && (
          <div style={styles.transcriptBox}>
            <p style={styles.transcriptLabel}>Dijiste:</p>
            <p style={styles.transcriptText}>"{textoReconocido}"</p>
          </div>
        )}

        {/* Comando Detectado */}
        {comandoDetectado && !esperandoAutorizacion && !pagoExitoso && (
          <div style={styles.commandCard}>
            <span style={styles.commandIcon}>{comandoDetectado.icono}</span>
            <h3 style={styles.commandName}>{comandoDetectado.nombre}</h3>
            <p style={styles.commandAmount}>${comandoDetectado.monto} MXN</p>
            <p style={styles.commandWallet}>{comandoDetectado.wallet}</p>
          </div>
        )}

        {/* Proceso de Autorización */}
        {esperandoAutorizacion && grantUrl && (
          <div style={styles.authContainer}>
            <div style={styles.alertBox}>
              <span style={styles.alertIcon}>⏳</span>
              <div style={{flex: 1}}>
                <p style={styles.alertText}>
                  Pago pendiente de autorización
                </p>
                <p style={{...styles.alertText, fontSize: '12px', marginTop: '5px'}}>
                  1. Abre el enlace de autorización<br/>
                  2. Autoriza el pago<br/>
                  3. Regresa y presiona "Finalizar Pago"
                </p>
              </div>
            </div>

            <button
              style={styles.linkButton}
              onClick={abrirAutorizacion}
            >
              <span style={styles.linkButtonIcon}>🔗</span>
              <span style={styles.linkButtonText}>Abrir enlace de autorización</span>
            </button>

            <div style={styles.divider}>
              <div style={styles.dividerLine}></div>
              <span style={styles.dividerText}>¿Ya autorizaste?</span>
              <div style={styles.dividerLine}></div>
            </div>

            <button
              style={{...styles.finalizeButton, ...(procesandoPago ? styles.buttonDisabled : {})}}
              onClick={finalizarPago}
              disabled={procesandoPago}
            >
              {procesandoPago ? (
                <span>⏳ Procesando...</span>
              ) : (
                <span>✅ Finalizar Pago</span>
              )}
            </button>

            <button
              style={styles.cancelLink}
              onClick={cancelarPago}
              disabled={procesandoPago}
            >
              Cancelar pago
            </button>
          </div>
        )}

        {/* Botón Ver Comandos */}
        {!esperandoAutorizacion && !pagoExitoso && (
          <button
            style={{...styles.listButton, ...(procesandoPago ? styles.buttonDisabled : {})}}
            onClick={() => setShowModal(true)}
            disabled={procesandoPago}
          >
            <span style={styles.listButtonText}>📋 Ver opciones de pago</span>
          </button>
        )}

        {/* Información */}
        <div style={styles.infoBox}>
          <span style={styles.infoIcon}>💡</span>
          <p style={styles.infoText}>
            Di: "Transferir a Eduardo" o "Pagar streaming"
          </p>
        </div>

        {/* Historial */}
        {historial.length > 0 && (
          <div style={styles.historyContainer}>
            <h3 style={styles.historyTitle}>📜 Historial de Pagos</h3>
            {historial.map(item => (
              <div key={item.id} style={styles.historyItem}>
                <span style={styles.historyIcon}>{item.icono}</span>
                <div style={styles.historyInfo}>
                  <p style={styles.historyName}>{item.comando}</p>
                  <p style={styles.historyWallet}>{item.wallet}</p>
                  <p style={styles.historyDate}>{item.fecha}</p>
                </div>
                <span style={styles.historyAmount}>${item.monto}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Comandos */}
      {showModal && (
        <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div style={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Opciones de Pago</h2>
              <button 
                style={styles.closeButton}
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>

            <div style={styles.modalScroll}>
              {COMANDOS.map((comando) => (
                <button
                  key={comando.id}
                  style={styles.modalItem}
                  onClick={() => seleccionarComando(comando)}
                >
                  <span style={styles.modalItemIcon}>{comando.icono}</span>
                  <div style={styles.modalItemInfo}>
                    <p style={styles.modalItemName}>{comando.nombre}</p>
                    <p style={styles.modalItemWallet}>{comando.wallet}</p>
                    <p style={styles.modalItemPattern}>
                      💬 "{comando.patrones[0]}"
                    </p>
                  </div>
                  <div style={styles.modalItemRight}>
                    <span style={styles.modalItemAmount}>${comando.monto}</span>
                    <span style={styles.modalItemArrow}>→</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación */}
      {showConfirm && comandoPendiente && (
        <div style={styles.modalOverlay} onClick={cancelarPago}>
          <div style={styles.confirmContainer} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.confirmTitle}>💳 Confirmar Pago</h2>
            <div style={styles.confirmContent}>
              <span style={styles.confirmIcon}>{comandoPendiente.icono}</span>
              <p style={styles.confirmName}>{comandoPendiente.nombre}</p>
              <p style={styles.confirmWallet}>{comandoPendiente.wallet}</p>
              <p style={styles.confirmAmount}>${comandoPendiente.monto} MXN</p>
            </div>
            <div style={styles.confirmButtons}>
              <button 
                style={{...styles.confirmButton, ...styles.cancelButton}}
                onClick={cancelarPago}
                disabled={procesandoPago}
              >
                Cancelar
              </button>
              <button 
                style={{...styles.confirmButton, ...styles.acceptButton, ...(procesandoPago ? styles.buttonDisabled : {})}}
                onClick={confirmarPago}
                disabled={procesandoPago}
              >
                {procesandoPago ? "Procesando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
  },
  header: {
    backgroundColor: '#fff',
    padding: '25px',
    textAlign: 'center',
    borderBottom: '1px solid #e0e0e0',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  headerTitle: {
    fontSize: '26px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0 0 8px 0'
  },
  headerSubtitle: {
    fontSize: '14px',
    color: '#666',
    margin: 0
  },
  content: {
    flex: 1,
    padding: '20px',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch'
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#fee',
    padding: '15px',
    borderRadius: '10px',
    marginBottom: '20px',
    borderLeft: '4px solid #dc3545'
  },
  errorIcon: {
    fontSize: '24px',
    marginRight: '12px'
  },
  errorText: {
    flex: 1,
    fontSize: '14px',
    color: '#721c24',
    margin: 0
  },
  successBox: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#d4edda',
    padding: '15px',
    borderRadius: '10px',
    marginBottom: '20px',
    borderLeft: '4px solid #28a745'
  },
  successIcon: {
    fontSize: '32px',
    marginRight: '15px'
  },
  successTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#155724',
    margin: '0 0 5px 0'
  },
  successText: {
    fontSize: '14px',
    color: '#155724',
    margin: 0
  },
  micContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    margin: '40px 0'
  },
  micButton: {
    width: '130px',
    height: '130px',
    borderRadius: '65px',
    backgroundColor: '#007AFF',
    border: 'none',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
    boxShadow: '0 8px 16px rgba(0, 122, 255, 0.4)',
    transition: 'all 0.3s ease',
    WebkitTapHighlightColor: 'transparent'
  },
  micButtonActive: {
    backgroundColor: '#dc3545',
    boxShadow: '0 8px 16px rgba(220, 53, 69, 0.4)'
  },
  micButtonDisabled: {
    backgroundColor: '#999',
    cursor: 'not-allowed',
    boxShadow: 'none'
  },
  micIcon: {
    fontSize: '65px'
  },
  micText: {
    marginTop: '20px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#333',
    textAlign: 'center'
  },
  parcialBox: {
    backgroundColor: '#fff3cd',
    padding: '18px',
    borderRadius: '12px',
    marginBottom: '15px',
    borderLeft: '4px solid #ffc107'
  },
  parcialLabel: {
    fontSize: '12px',
    color: '#856404',
    fontWeight: '600',
    margin: '0 0 5px 0'
  },
  parcialText: {
    fontSize: '16px',
    color: '#856404',
    fontWeight: '500',
    margin: 0
  },
  transcriptBox: {
    backgroundColor: '#e3f2fd',
    padding: '18px',
    borderRadius: '12px',
    marginBottom: '20px',
    borderLeft: '4px solid #007AFF'
  },
  transcriptLabel: {
    fontSize: '12px',
    color: '#0056b3',
    fontWeight: '600',
    margin: '0 0 5px 0'
  },
  transcriptText: {
    fontSize: '16px',
    color: '#333',
    fontStyle: 'italic',
    margin: 0
  },
  commandCard: {
    backgroundColor: '#fff',
    borderRadius: '15px',
    padding: '30px',
    marginBottom: '20px',
    textAlign: 'center',
    border: '2px solid #007AFF',
    boxShadow: '0 4px 8px rgba(0,0,0,0.15)'
  },
  commandIcon: {
    fontSize: '60px',
    display: 'block',
    marginBottom: '15px'
  },
  commandName: {
    fontSize: '22px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0 0 8px 0'
  },
  commandAmount: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#007AFF',
    margin: '0 0 8px 0'
  },
  commandWallet: {
    fontSize: '12px',
    color: '#666',
    margin: 0,
    wordBreak: 'break-all'
  },
  authContainer: {
    backgroundColor: '#fff',
    borderRadius: '15px',
    padding: '20px',
    marginBottom: '20px'
  },
  alertBox: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    padding: '15px',
    borderRadius: '10px',
    marginBottom: '15px',
    borderLeft: '4px solid #ffc107'
  },
  alertIcon: {
    fontSize: '24px',
    marginRight: '12px'
  },
  alertText: {
    flex: 1,
    fontSize: '14px',
    color: '#856404',
    fontWeight: '500',
    margin: 0
  },
  linkButton: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '15px',
    backgroundColor: '#007AFF',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginBottom: '15px',
    WebkitTapHighlightColor: 'transparent'
  },
  linkButtonIcon: {
    fontSize: '20px'
  },
  linkButtonText: {
    fontSize: '16px'
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    margin: '20px 0'
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    backgroundColor: '#ddd'
  },
  dividerText: {
    margin: '0 10px',
    fontSize: '12px',
    color: '#666'
  },
  finalizeButton: {
    width: '100%',
    padding: '15px',
    backgroundColor: '#28a745',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginBottom: '10px',
    WebkitTapHighlightColor: 'transparent'
  },
  cancelLink: {
    width: '100%',
    padding: '10px',
    background: 'none',
    border: 'none',
    color: '#dc3545',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    textAlign: 'center',
    WebkitTapHighlightColor: 'transparent'
  },
  listButton: {
    width: '100%',
    backgroundColor: '#fff',
    border: '2px solid #007AFF',
    padding: '18px',
    borderRadius: '12px',
    cursor: 'pointer',
    marginBottom: '20px',
    WebkitTapHighlightColor: 'transparent'
  },
  listButtonText: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#007AFF'
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed'
  },
  infoBox: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: '15px',
    borderRadius: '10px',
    marginBottom: '20px'
  },
  infoIcon: {
    fontSize: '24px',
    marginRight: '12px'
  },
  infoText: {
    flex: 1,
    fontSize: '13px',
    color: '#666',
    lineHeight: '20px',
    margin: 0
  },
  historyContainer: {
    backgroundColor: '#fff',
    borderRadius: '15px',
    padding: '18px',
    marginTop: '10px',
    marginBottom: '20px'
  },
  historyTitle: {
    fontSize: '17px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0 0 15px 0'
  },
  historyItem: {
    display: 'flex',
    alignItems: 'center',
    paddingTop: '14px',
    paddingBottom: '14px',
    borderBottom: '1px solid #f0f0f0'
  },
  historyIcon: {
    fontSize: '28px',
    marginRight: '15px'
  },
  historyInfo: {
    flex: 1
  },
  historyName: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#333',
    margin: '0 0 3px 0'
  },
  historyWallet: {
    fontSize: '11px',
    color: '#999',
    margin: '0 0 3px 0',
    wordBreak: 'break-all'
  },
  historyDate: {
    fontSize: '12px',
    color: '#999',
    margin: 0
  },
  historyAmount: {
    fontSize: '17px',
    fontWeight: 'bold',
    color: '#007AFF'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-end',
    zIndex: 1000
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: '25px',
    borderTopRightRadius: '25px',
    maxHeight: '85vh',
    width: '100%',
    display: 'flex',
    flexDirection: 'column'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '22px',
    borderBottom: '1px solid #e0e0e0'
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333',
    margin: 0
  },
  closeButton: {
    fontSize: '28px',
    color: '#666',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    padding: '0',
    lineHeight: '1',
    WebkitTapHighlightColor: 'transparent'
  },
  modalScroll: {
    padding: '20px',
    overflowY: 'auto',
    flex: 1,
    WebkitOverflowScrolling: 'touch'
  },
  modalItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px 0',
    borderBottom: '1px solid #f0f0f0',
    background: 'none',
    border: 'none',
    borderBottom: '1px solid #f0f0f0',
    width: '100%',
    textAlign: 'left',
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent'
  },
  modalItemIcon: {
    fontSize: '36px',
    marginRight: '16px'
  },
  modalItemInfo: {
    flex: 1
  },
  modalItemName: {
    fontSize: '17px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0 0 4px 0'
  },
  modalItemWallet: {
    fontSize: '11px',
    color: '#666',
    margin: '0 0 4px 0',
    wordBreak: 'break-all'
  },
  modalItemPattern: {
    fontSize: '13px',
    color: '#007AFF',
    fontStyle: 'italic',
    margin: 0
  },
  modalItemRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end'
  },
  modalItemAmount: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: '4px'
  },
  modalItemArrow: {
    fontSize: '20px',
    color: '#007AFF'
  },
  confirmContainer: {
    backgroundColor: '#fff',
    borderRadius: '20px',
    padding: '30px',
    margin: '20px',
    maxWidth: '400px',
    width: 'calc(100% - 40px)'
  },
  confirmTitle: {
    fontSize: '22px',
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    margin: '0 0 20px 0'
  },
  confirmContent: {
    textAlign: 'center',
    marginBottom: '25px'
  },
  confirmIcon: {
    fontSize: '70px',
    display: 'block',
    marginBottom: '15px'
  },
  confirmName: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0 0 8px 0'
  },
  confirmWallet: {
    fontSize: '12px',
    color: '#666',
    margin: '0 0 10px 0',
    wordBreak: 'break-all'
  },
  confirmAmount: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#007AFF',
    margin: 0
  },
  confirmButtons: {
    display: 'flex',
    gap: '12px'
  },
  confirmButton: {
    flex: 1,
    padding: '15px',
    borderRadius: '12px',
    border: 'none',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent'
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    color: '#333'
  },
  acceptButton: {
    backgroundColor: '#007AFF',
    color: '#fff'
  }
};