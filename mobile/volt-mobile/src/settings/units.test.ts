import { platesPerSide } from './units';
test('plates per side, greedy', () => expect(platesPerSide(147.5, 20, [25, 20, 15, 10, 5, 2.5, 1.25])).toEqual([25, 25, 10, 2.5, 1.25]));
test('bar only', () => expect(platesPerSide(20, 20, [25, 20])).toEqual([]));
test('below bar', () => expect(platesPerSide(10, 20, [25, 20])).toEqual([]));
