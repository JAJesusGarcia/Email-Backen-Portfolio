require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

//DEPURAR
console.log('Variables de entorno cargadas:', {
  EMAIL_HOST: process.env.EMAIL_HOST,
  EMAIL_PORT: process.env.EMAIL_PORT,
  EMAIL_USER: process.env.EMAIL_USER,
  NODE_ENV: process.env.NODE_ENV,
});

// Configuración de CORS
app.use(
  cors({
    origin: [
      'https://portfolio-zeta-flax-88.vercel.app',
      'http://localhost:3000',
    ], // Permitir tanto producción como desarrollo
    methods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  }),
);

// Limitar las solicitudes por IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // límite de 5 solicitudes por ventana
});

// Middleware
// Limitar tamaño del payload
app.use(bodyParser.json({ limit: '10kb' }));
app.use('/api/contact', limiter);

// Función de validación
const validateInput = (data) => {
  const { name, email, message } = data;

  if (!name || !email || !message) {
    return { isValid: false, error: 'Todos los campos son requeridos' };
  }

  if (typeof name !== 'string' || name.length > 100) {
    return { isValid: false, error: 'Nombre inválido' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Email inválido' };
  }

  if (typeof message !== 'string' || message.length > 1000) {
    return { isValid: false, error: 'Mensaje inválido' };
  }

  return { isValid: true };
};

// Configuración de nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

console.log('Configuración del transporter:', {
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  user: process.env.EMAIL_USER,
});

// Verificar configuración del email al inicio
transporter.verify(function (error, success) {
  if (error) {
    console.error('Error en la configuración del email:', error);
  } else {
    console.log('Servidor está listo para enviar emails');
  }
});

// Ruta para manejar el envío de correos
app.post('/api/contact', async (req, res) => {
  try {
    // Validar input
    const validationResult = validateInput(req.body);
    if (!validationResult.isValid) {
      return res.status(400).json({ message: validationResult.error });
    }

    const { name, email, message } = req.body;

    const mailOptions = {
      from: `"Portfolio - Jesus Garcia" <${process.env.EMAIL_USER}>`,
      to: process.env.RECEIVER_EMAIL,
      subject: `Nuevo mensaje de contacto de ${name}`,
      text: `Nombre: ${name}\nCorreo: ${email}\nMensaje: ${message}`,
      html: `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            font-family: 'Inter', Arial, sans-serif;
            background-color: #0f172a;
            color: #e2e8f0;
          }
          .header {
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            background-color: #1e293b;
            border: 1px solid #334155;
          }
          .message-box {
            border-left: 4px solid #38bdf8;
            padding: 15px;
            margin: 20px 0;
            background-color: #1e293b;
            border-radius: 4px;
          }
          .footer {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #334155;
            font-size: 14px;
            color: #94a3b8;
          }
          h2 {
            color: #38bdf8;
            margin: 0;
          }
          p {
            line-height: 1.6;
          }
          .label {
            color: #38bdf8;
            font-weight: 600;
            margin-bottom: 4px;
          }
          .content {
            background-color: #1e293b;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #334155;
          }
        </style>
      </head>
      <body style="background-color: #0f172a; margin: 0; padding: 20px;">
        <div class="container">
          <div class="header">
            <h2>Nuevo Mensaje de Contacto</h2>
          </div>
          
          <div class="content">
            <div class="label">De:</div>
            <p>${name}</p>
            
            <div class="label">Email:</div>
            <p>${email}</p>
            
            <div class="message-box">
              <div class="label">Mensaje:</div>
              <p style="white-space: pre-wrap;">${message}</p>
            </div>
          </div>
          
          <div class="footer">
            <p>Este mensaje fue enviado desde el formulario de contacto de tu portfolio.</p>
          </div>
        </div>
      </body>
    </html>
  `,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Correo enviado exitosamente' });
  } catch (error) {
    console.error('Error al enviar el correo:', error);
    res.status(500).json({
      message: 'Error al enviar el correo',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// Middleware de error global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
