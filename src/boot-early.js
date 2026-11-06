// Inicializacao antecipada: idioma e tratamento global de erros.
import { initI18n } from './i18n.js';
import { installGlobalErrorHandlers } from './error-handler.js';

initI18n();
installGlobalErrorHandlers();
