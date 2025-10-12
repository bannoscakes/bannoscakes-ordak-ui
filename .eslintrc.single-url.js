module.exports = {
  rules: {
    // Custom rule to prevent role-specific URL patterns
    'no-hardcoded-role-urls': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Prevent hardcoded role-specific URLs',
          category: 'Best Practices',
        },
        fixable: null,
        schema: [],
        messages: {
          noRoleUrls: 'Avoid hardcoded role-specific URLs. Use single URL architecture with role-based routing instead.',
        },
      },
      create(context) {
        const forbiddenPatterns = [
          '/workspace/staff',
          '/workspace/supervisor',
          '/dashboard',
          'workspace/staff',
          'workspace/supervisor',
          'dashboard'
        ];

        return {
          Literal(node) {
            if (typeof node.value === 'string') {
              forbiddenPatterns.forEach(pattern => {
                if (node.value.includes(pattern)) {
                  context.report({
                    node,
                    messageId: 'noRoleUrls',
                  });
                }
              });
            }
          },
          TemplateLiteral(node) {
            node.quasis.forEach(quasi => {
              forbiddenPatterns.forEach(pattern => {
                if (quasi.value.raw.includes(pattern)) {
                  context.report({
                    node,
                    messageId: 'noRoleUrls',
                  });
                }
              });
            });
          },
        };
      },
    },
  },
};
