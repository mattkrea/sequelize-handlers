module.exports = {
	'env': {
		'browser': true,
		'commonjs': true,
		'es6': true,
		'node': true
  },
	'extends': 'eslint:recommended',
	'parserOptions': {
		'sourceType': 'module',
		'ecmaVersion': 2017,
		'ecmaFeatures': {
			'experimentalObjectRestSpread': true
    }
  },
	'globals': {
		'describe': true,
		'it': true,
		'before': true,
		'after': true,
		'beforeEach': true,
		'afterEach': true
  },
	'rules': {
		'indent': ['warn', 'tab'
    ],
		'linebreak-style': ['error', 'unix'
    ],
		'quotes': [
			'warn',
			'single',
      {
				'avoidEscape': true,
				'allowTemplateLiterals': true
      }
    ],
		'semi': ['error', 'always'
    ],
		'curly': ['error', 'all'
    ],
		'dot-notation': 'error',
		'no-unused-vars': [
			'error',
      {
				'vars': 'all',
				'args': 'after-used',
				'argsIgnorePattern': 'next'
      }
    ],
		'eol-last': ['warn', 'unix'
    ],
		'no-multiple-empty-lines': [
			'warn',
      {
				'max': 2
      }
    ],
		'no-path-concat': 'error',
		'camelcase': 'error',
		'arrow-parens': 'error',
		'arrow-spacing': 'error',
		'no-const-assign': 'error',
		'no-class-assign': 'error',
		'no-new-symbol': 'error',
		'template-curly-spacing': ['error', 'never'
    ],
		'prefer-template': 'error',
		'no-array-constructor': 'error',
		'no-shadow': 'error',
		'no-cond-assign': ['error', 'except-parens'
    ],
		'no-trailing-spaces': 'warn',
		'no-else-return': 'error',
		'use-isnan': 'error',
		'no-use-before-define': [
			'error',
      {
				'functions': false,
				'classes': true
      }
    ],
		'no-duplicate-imports': [
			'error',
      {
				'includeExports': true
      }
    ],
		'prefer-arrow-callback': [
			'error',
      {
				'allowNamedFunctions': true
      }
    ],
		'require-jsdoc': [
			'error',
      {
				'require': {
					'FunctionDeclaration': true,
					'MethodDefinition': false,
					'ClassDeclaration': false
        }
      }
    ],
		'keyword-spacing': 'warn',
		'valid-jsdoc': [
			'error',
      {
				'requireReturn': false,
				'prefer': {
					'return': 'returns'
        }
      }
    ],
		'object-curly-spacing': ['warn', 'always'
    ],
		'space-in-parens': ['warn', 'never'
    ],
		'no-var': 'error',
		'space-before-function-paren': [
			'error',
      {
				'anonymous': 'never',
				'named': 'never',
				'asyncArrow': 'always'
      }
    ],
		'max-len': [
			'warn',
      {
				'code': 120
      }
    ]
  }
};
