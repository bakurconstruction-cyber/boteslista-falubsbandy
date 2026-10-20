// Netlify Function: hela API:t (/api/*). Logiken finns i server/app.js.
import appModule from '../../server/app.js';

const { handle } = appModule;

export default async (request, context) => handle(request, { ip: context.ip || '' });

export const config = { path: '/api/*' };
