// src/components/Login.js
import React, { useState } from 'react';
import { TextField, Button, Paper, Typography } from '@mui/material';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider 
} from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const auth = getAuth();
  const provider = new GoogleAuthProvider();
  const navigate = useNavigate();

  // Manejo de autenticación por correo y contraseña
  const handleEmailPassword = async () => {
    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
        setMessage('Registro exitoso, redirigiendo...');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        setMessage('Inicio de sesión exitoso, redirigiendo...');
      }
      // Redirige al dashboard o a la página principal
      navigate('/dashboard');
    } catch (error) {
      console.error('Error en autenticación:', error);
      setMessage(error.message);
    }
  };

  // Autenticación con Google
  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, provider);
      setMessage('Inicio de sesión con Google exitoso, redirigiendo...');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error en autenticación con Google:', error);
      setMessage(error.message);
    }
  };

  return (
    <Paper sx={{ padding: 2, maxWidth: 400, margin: 'auto', marginTop: 4 }}>
      <Typography variant="h5" gutterBottom>
        {isRegister ? 'Registrarse' : 'Iniciar Sesión'}
      </Typography>
      <TextField
        fullWidth
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        sx={{ marginBottom: 2 }}
      />
      <TextField
        fullWidth
        label="Contraseña"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        sx={{ marginBottom: 2 }}
      />
      <Button 
        variant="contained" 
        color="primary" 
        onClick={handleEmailPassword}
        sx={{ marginBottom: 2 }}
      >
        {isRegister ? 'Registrarse' : 'Iniciar Sesión'}
      </Button>
      <Button 
        variant="outlined" 
        color="secondary" 
        onClick={handleGoogleSignIn}
        sx={{ marginBottom: 2 }}
      >
        Continuar con Google
      </Button>
      {message && (
        <Typography variant="body2" color="error" sx={{ marginBottom: 2 }}>
          {message}
        </Typography>
      )}
      <Typography variant="body2">
        {isRegister ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}{' '}
        <Button onClick={() => setIsRegister(!isRegister)} size="small">
          {isRegister ? 'Inicia sesión' : 'Regístrate'}
        </Button>
      </Typography>
    </Paper>
  );
};

export default Login;
