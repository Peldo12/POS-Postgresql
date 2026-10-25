const control = require('./controller');
const { router, authenticate, validate, idString } = require('../config/base');

router.use(authenticate);

router.get('/', control.users);
router.get('/:id', validate.params(idString), control.byId);
router.put('/:id/update', validate.params(idString), control.update);

module.exports = router;
