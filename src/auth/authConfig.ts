export const loginRequest = {
  scopes: ['User.Read', 'Mail.Read', 'offline_access'],
  // Let users pick any Microsoft account (work, school, or personal)
  prompt: 'select_account',
};

export const graphScopes = {
  scopes: ['User.Read', 'Mail.Read'],
};
