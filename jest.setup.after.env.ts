import '@testing-library/jest-dom';
// jest.setup.after.env.ts
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;
