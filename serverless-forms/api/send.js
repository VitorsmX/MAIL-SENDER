import { processForm } from '../lib/post';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Método não permitido');
  }

  const options = {
    to: process.env.TO, // Pode ser string ou JSON
    tokenField: 'token',
    honeyField: 'site',
    thanksField: 'thanks',
    siteField: 'site',
    message: 'Solicitação recebida com sucesso!',
    redirect: 'false',
    disclaimer: process.env.DISCLAIMER || '',
    mail: {
      from: process.env.MAIL_FROM,
      host: process.env.MAIL_HOST,
      port: process.env.MAIL_PORT,
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
    hook: process.env.HOOK || null,
  };

  processForm(req, res, options);
}
