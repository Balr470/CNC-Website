const express = require('express');
const designController = require('../controllers/design.controller');
const { protect } = require('../middlewares/auth.middleware');
const { restrictToAdmin } = require('../middlewares/admin.middleware');

const router = express.Router();

const { upload } = require('../middlewares/multer.middleware');

router.route('/')
    .get(designController.getAllDesigns)
    .post(
        protect,
        restrictToAdmin,
        upload.fields([
            { name: "preview", maxCount: 1 },
            { name: "cnc", maxCount: 1 }
        ]),
        designController.createDesign
    );

router.route('/:id')
    .get(designController.getDesign)
    .put(protect, restrictToAdmin, designController.updateDesign)
    .delete(protect, restrictToAdmin, designController.deleteDesign);

module.exports = router;
