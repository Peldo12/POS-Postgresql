const validate = require('../../src/common/middleware/validate');

describe('Middleware Validate', () => {
  describe('Validate Params', () => {
    test('should call next when validation success', () => {
      const schema = {
        validate: jest.fn().mockReturnValue({
          error: null,
        }),
      };
      const req = {
        params: {
          id: 10,
        },
      };
      const res = {};
      const next = jest.fn();

      validate.params(schema)(req, res, next);

      expect(schema.validate).toHaveBeenCalledWith(req.params);
      expect(next).toHaveBeenCalled();
    });

    test('should return 400 when validation failed', () => {
      const schema = {
        validate: jest.fn().mockReturnValue({
          error: {
            details: [
              {
                message: 'Invalid id',
              },
            ],
          },
        }),
      };
      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      const next = jest.fn();
      validate.params(schema)(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);

      expect(res.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'Invalid id',
      });

      expect(next).not.toHaveBeenCalled();
    });
  });
});
