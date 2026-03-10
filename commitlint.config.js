module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'perf', 'refactor', 'chore', 'docs', 'test', 'ci'],
    ],
    'scope-enum': [
      1,
      'always',
      [
        'auth', 'admins', 'tenants', 'users', 'roles',
        'hr', 'inventory', 'crm', 'purchasing', 'projects',
        'notifications', 'chat', 'reporting', 'subscriptions',
        'db', 'queue', 'cache', 'websocket', 'firebase',
        'mail', 'pdf', 'storage', 'common', 'deps',
      ],
    ],
    'subject-case': [2, 'never', ['start-case', 'pascal-case', 'upper-case']],
    'header-max-length': [2, 'always', 100],
  },
};
