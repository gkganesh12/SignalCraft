module.exports = {
    moduleFileExtensions: ['js', 'json', 'ts'],
    rootDir: 'src',
    testRegex: '.*\\.spec\\.ts$',
    transform: {
        '^.+\\.(t|j)s$': ['ts-jest', {
            tsconfig: 'tsconfig.spec.json',
        }],
    },
    collectCoverageFrom: [
        '**/*.ts', // collect coverage from all ts files
        '!**/*.module.ts', // exclude modules
        '!**/*.dto.ts', // exclude DTOs
        '!**/index.ts', // exclude barrels
        '!main.ts',
    ],
    coverageDirectory: '../coverage',
    testEnvironment: 'node',
};
