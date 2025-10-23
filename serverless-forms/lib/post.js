import formidable from 'formidable';
import { sendMail } from './email.js';
import { sendHook } from './hook.js';

function generateEmailBody(fields, referer, options) {
  const tipoFormulario = fields.tipoFormulario || 'usuario';

  // ======== TEMPLATE PARA SOLICITAÇÃO DE USUÁRIO ========
  if (tipoFormulario === 'usuario') {
    return `
      <div style="font-family:Arial, sans-serif; background-color:#f4f6f8; padding:20px;">
        <h2 style="color:#005baa;">📩 Solicitação de ${fields.tipoSolicitacao || 'Criação de Acesso'}</h2>
        <p style="color:#444; font-size:14px;">
          Enviada a partir de: <strong>${referer || 'Formulário interno da Cellent'}</strong>
        </p>

        <div style="background:#ffffff; padding:15px 20px; border-radius:8px; margin-bottom:20px;">
          <h3 style="color:#005baa; border-bottom:1px solid #ccc;">🧾 Dados do Solicitante</h3>
          <p>
            <strong>Nome:</strong> ${fields.nomeSolicitante || '-'}<br/>
            <strong>Unidade:</strong> ${fields.unidadeSolicitante || '-'}<br/>
            <strong>E-mail:</strong> ${fields.emailSolicitante || '-'}<br/>
            <strong>Telefone:</strong> ${fields.telefoneSolicitante || '-'}
          </p>
        </div>

        <div style="background:#ffffff; padding:15px 20px; border-radius:8px;">
          <h3 style="color:#005baa; border-bottom:1px solid #ccc;">👤 Dados do Profissional</h3>
          <table style="width:100%; border-collapse:collapse;">
            <tbody>
              ${Object.keys(fields)
                .filter(f =>
                  ![
                    'token','thanks','site','tipoFormulario','tipoSolicitacao',
                    'nomeSolicitante','unidadeSolicitante','emailSolicitante','telefoneSolicitante'
                  ].includes(f)
                )
                .map(f => `
                  <tr>
                    <td style="padding:8px; border-bottom:1px solid #ddd; width:35%;"><b>${f}</b></td>
                    <td style="padding:8px; border-bottom:1px solid #ddd;">${fields[f]}</td>
                  </tr>
                `)
                .join('')}
            </tbody>
          </table>
        </div>

        <p style="margin-top:20px; font-size:13px; color:#666;">
          Esta solicitação deve ser validada pelo administrador responsável da unidade.
        </p>

        ${
          options?.disclaimer
            ? `<p style="font-size:12px; color:#888;">${options.disclaimer}</p>`
            : ''
        }

        <p style="margin-top:20px; font-size:12px; color:#999;">
          Este e-mail foi gerado automaticamente pelo sistema de solicitações da Cellent.
        </p>
      </div>
    `;
  }

  // ======== TEMPLATE PARA SOLICITAÇÃO DE UNIDADE ========
  if (tipoFormulario === 'unidade') {
    return `
      <div style="font-family:Arial, sans-serif; background-color:#f4f6f8; padding:20px;">
        <h2 style="color:#005baa;">🏢 Solicitação de Inclusão de Nova Unidade</h2>
        <p style="color:#444; font-size:14px;">
          Enviada a partir de: <strong>${referer || 'Formulário interno da Cellent'}</strong>
        </p>

        <div style="background:#ffffff; padding:15px 20px; border-radius:8px; margin-bottom:20px;">
          <h3 style="color:#005baa; border-bottom:1px solid #ccc;">🧾 Dados do Solicitante</h3>
          <p>
            <strong>Nome:</strong> ${fields.nomeSolicitanteU || '-'}<br/>
            <strong>Unidade:</strong> ${fields.unidadeSolicitanteU || '-'}<br/>
            <strong>E-mail:</strong> ${fields.emailSolicitanteU || '-'}<br/>
            <strong>Telefone:</strong> ${fields.telefoneSolicitanteU || '-'}
          </p>
        </div>

        <div style="background:#ffffff; padding:15px 20px; border-radius:8px;">
          <h3 style="color:#005baa; border-bottom:1px solid #ccc;">🏢 Dados da Unidade a Ser Criada</h3>
          <table style="width:100%; border-collapse:collapse;">
            <tbody>
              ${Object.keys(fields)
                .filter(f =>
                  ![
                    'token','thanks','site','tipoFormulario',
                    'nomeSolicitanteU','unidadeSolicitanteU','emailSolicitanteU','telefoneSolicitanteU'
                  ].includes(f)
                )
                .map(f => `
                  <tr>
                    <td style="padding:8px; border-bottom:1px solid #ddd; width:35%;"><b>${f}</b></td>
                    <td style="padding:8px; border-bottom:1px solid #ddd;">${fields[f]}</td>
                  </tr>
                `)
                .join('')}
            </tbody>
          </table>
        </div>

        <p style="margin-top:20px; font-size:13px; color:#666;">
          Esta solicitação refere-se à criação de uma nova unidade no sistema.
        </p>

        <p style="margin-top:20px; font-size:12px; color:#999;">
          Este e-mail foi gerado automaticamente pelo sistema de solicitações da Cellent.
        </p>
      </div>
    `;
  }

  return '<p>Erro: Tipo de formulário desconhecido.</p>';
}


// get the email addresses from the `TO` env var
// @example TO="email1@domain,email2@domain"
// @example TO="{ \"token1\": \"email1@domain\", \"token2\": \"email2@domain\" }"
function toJsonOrString(jsonOrString) {
  try {
    if(typeof jsonOrString === 'string') {
      return [null, JSON.parse(jsonOrString)];
    } else {
      return [null, jsonOrString];
    }
  } catch (e) {
    console.info('TO env var is not a JSON object. Using as a string.');
    return [jsonOrString, null];
  }
}

function getRecipient(fields, options) {
  const [toStr, toJson] = toJsonOrString(options.to);
  const to = toStr || toJson[fields[options.tokenField]];
  if (!to) {
    console.error('No email address found in the form', { toStr, toJson }, `Add a field named ${options.tokenField} with a value that matches one of the tokens in the TO env var`);
    throw new Error(`No email address found for token: ${fields[options.tokenField]}`);
  }
  return to
}

function getHookParsed(fields, hookJson, options) {
  if (hookJson.url && hookJson.headers) {
    // Catch all hook
    return hookJson;
  } else if (!options.tokenField) {
    return null;
  }
  const key = fields[options.tokenField];
  if (!key) {
    console.warn(`No token found in the form for field ${options.tokenField}`);
    return null;
  }
  return hookJson[key];
}

function getHook(fields, options) {
  if(!options.hook) {
    return null;
  }
  // Case of 1 hook for all forms
  try {
    if (typeof options.hook === 'string') {
      const hookJson = JSON.parse(options.hook);
      return getHookParsed(fields, hookJson, options);
    } else {
      return getHookParsed(fields, options.hook, options);
    }
  } catch(e) {
    console.error('hook option is not a JSON object', e.message, options.hook);
    throw new Error(`hook option is not a JSON object. ${e.message}`);
  }
}

function handleResponse(res, fields, options) {
  if (options.redirect === 'true' && fields[options.thanksField]) {
    res.writeHead(302, { Location: fields[options.thanksField] });
    res.end();
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(options.message);
  }
}

function handleError(res, err) {
  res.writeHead(500, { 'Content-Type': 'text/plain' });
  res.end(`Error: ${err.message}`);
}

export function processForm(req, res, options) {
  const form = new formidable.IncomingForm();
  const fields = {};

  form.on('field', (field, value) => {
    fields[field] = value;
  });

  form.on('end', async () => {
    try {
      handleForm(fields, req.headers.referer, options, JSON.stringify(req.headers));
      handleResponse(res, fields, options);
    } catch (err) {
      handleError(res, err);
    }
  });

  try {
    form.parse(req);
  } catch (err) {
    handleError(res, err);
  }
}

// Exported for testing
export async function handleForm(fields, refererHeader, options, headersString) {
  const referer = fields[options.siteField] || refererHeader || 'Formulário de Solicitação';
  const html = generateEmailBody(fields, referer, options);
  const to = getRecipient(fields, options);
  const hook = getHook(fields, options);

  const tipoFormulario = fields.tipoFormulario || 'usuario';
  let subject = '';

  if (tipoFormulario === 'usuario') {
    const tipoSolicitacao = (fields.tipoSolicitacao || 'INCLUSÃO DE LOGIN').toUpperCase();
    const unidade = fields.unidadeSolicitante || 'Unidade não informada';
    const nome = fields.nomeSolicitante || 'Nome não informado';
    const telefone = fields.telefoneSolicitante || 'Telefone não informado';
    subject = `${tipoSolicitacao} – ${unidade}, ${nome}, ${telefone}`;
  } else if (tipoFormulario === 'unidade') {
    const unidade = fields.unidadeSolicitanteU || 'Unidade não informada';
    const nome = fields.nomeSolicitanteU || 'Nome não informado';
    const telefone = fields.telefoneSolicitanteU || 'Telefone não informado';
    subject = `INCLUSÃO DE UNIDADE – ${unidade}, ${nome}, ${telefone}`;
  }

  if (fields[options.honeyField]) {
    if (hook) {
      await sendHook(html, to, headersString, hook, fields, false, 'Honey pot field was filled');
    }
    return;
  }

  try {
    const result = await sendMail(html, to, subject, options.mail);
    if (hook) {
      await sendHook(html, to, headersString, hook, fields, result.rejected.length === 0, result.response);
    }
  } catch (err) {
    if (hook) {
      await sendHook(html, to, headersString, hook, fields, false, err.message);
    }
    throw err;
  }
}
