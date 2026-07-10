// Reusable CRUD factory functions for Mongoose models

export const getAll = (Model, populateOptions = '') => async (req, res) => {
  try {
    const docs = await Model.find().populate(populateOptions).lean();
    res.status(200).json({ success: true, data: docs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error retrieving documents', error: error.message });
  }
};

export const getOne = (Model, populateOptions = '') => async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Model.findById(id).populate(populateOptions).lean();
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }
    res.status(200).json({ success: true, data: doc });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error retrieving document', error: error.message });
  }
};

export const createOne = (Model) => async (req, res) => {
  try {
    const newDoc = await Model.create(req.body);
    res.status(201).json({ success: true, data: newDoc });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Error creating document', error: error.message });
  }
};

export const updateOne = (Model) => async (req, res) => {
  try {
    const { id } = req.params;
    const updatedDoc = await Model.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updatedDoc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }
    res.status(200).json({ success: true, data: updatedDoc });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Error updating document', error: error.message });
  }
};

export const deleteOne = (Model) => async (req, res) => {
  try {
    const { id } = req.params;
    const deletedDoc = await Model.findByIdAndDelete(id);
    if (!deletedDoc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }
    res.status(200).json({ success: true, message: 'Document deleted successfully', data: deletedDoc });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting document', error: error.message });
  }
};

export const crudFactory = (Model) => ({
  getAll: getAll(Model),
  getOne: getOne(Model),
  createOne: createOne(Model),
  updateOne: updateOne(Model),
  deleteOne: deleteOne(Model),
});
