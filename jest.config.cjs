const { jestConfig } = require('@salesforce/sfdx-lwc-jest/config');

module.exports = {
    ...jestConfig,
    roots: ['<rootDir>/force-app/main/default/lwc'],
    modulePathIgnorePatterns: ['<rootDir>/.localdevserver']
};
