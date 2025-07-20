import { customAlphabet } from 'nanoid';

type TOptions = {
  numberOnly?: boolean;
};
export const randomID = (size = 8, options: TOptions = {}) => {
  const { numberOnly } = options;

  if (numberOnly) {
    return customAlphabet('1234567890')(size);
  }

  return customAlphabet(
    '1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-',
  )(size);
};
