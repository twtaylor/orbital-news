/**
 * Enhanced mongoose mock for testing
 * This mock provides better support for Schema construction and model operations
 */

class MockSchema {
  private options: any;
  private paths: any;
  private indices: any[];

  constructor(definition: any, options: any = {}) {
    this.options = options;
    this.paths = definition;
    this.indices = [];
  }

  index(fields: any, options: any = {}) {
    this.indices.push({ fields, options });
    return this;
  }

  pre() {
    return this; // Chainable
  }

  post() {
    return this; // Chainable
  }

  virtual() {
    return {
      get: jest.fn(),
      set: jest.fn()
    };
  }

  method() {
    return this;
  }

  static() {
    return this;
  }
}

class MockModel {
  private name: string;
  private schema: any;
  private documents: any[] = [];

  constructor(name: string, schema: any) {
    this.name = name;
    this.schema = schema;
  }

  find = jest.fn().mockImplementation((query = {}) => {
    return {
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(this.documents),
      exec: jest.fn().mockResolvedValue(this.documents)
    };
  });

  findOne = jest.fn().mockImplementation((query = {}) => {
    return {
      lean: jest.fn().mockResolvedValue(this.documents[0] || null),
      exec: jest.fn().mockResolvedValue(this.documents[0] || null)
    };
  });

  findOneAndUpdate = jest.fn().mockImplementation((query = {}, update = {}, options = {}) => {
    const doc = this.documents[0] || { _id: 'mock-id-' + Math.random().toString(36).substring(7) };
    return {
      lean: jest.fn().mockResolvedValue({ ...doc, ...update }),
      exec: jest.fn().mockResolvedValue({ ...doc, ...update })
    };
  });

  countDocuments = jest.fn().mockResolvedValue(this.documents.length);

  deleteMany = jest.fn().mockResolvedValue({ deletedCount: 0 });

  create = jest.fn().mockImplementation((doc) => {
    const newDoc = {
      ...doc,
      _id: 'mock-id-' + Math.random().toString(36).substring(7),
      save: jest.fn().mockResolvedValue(doc)
    };
    this.documents.push(newDoc);
    return Promise.resolve(newDoc);
  });

  insertMany = jest.fn().mockImplementation((docs) => {
    const newDocs = docs.map((doc: any) => ({
      ...doc,
      _id: 'mock-id-' + Math.random().toString(36).substring(7)
    }));
    this.documents.push(...newDocs);
    return Promise.resolve(newDocs);
  });

  // Mock for static methods
  static mockStaticMethod = jest.fn();
}

// Create the main mongoose mock
const mongooseMock = {
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  connection: {
    readyState: 1, // Connected by default
    db: {
      listCollections: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([
          { name: 'articles' }
        ])
      })
    },
    on: jest.fn(),
    once: jest.fn()
  },
  Schema: jest.fn().mockImplementation((definition, options) => {
    return new MockSchema(definition, options);
  }),
  model: jest.fn().mockImplementation((modelName, schema) => {
    return new MockModel(modelName, schema);
  }),
  // Add Types for validation
  Types: {
    ObjectId: String,
    String: String,
    Number: Number,
    Boolean: Boolean,
    Date: Date,
    Array: Array,
    Mixed: Object,
    Buffer: Buffer,
    Map: Map
  }
};

// Make Schema accessible as both a property and a constructor
(mongooseMock as any).Schema.prototype = MockSchema.prototype;

export default mongooseMock;
