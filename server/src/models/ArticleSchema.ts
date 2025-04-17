import mongoose, { Schema, Document } from 'mongoose';
import { Article, TierType } from '../types/models/article.type';

// Interface for the MongoDB document that extends the Article interface
// Use Omit to avoid conflicts between Article.id and Document._id
export interface ArticleDocument extends Omit<Article, 'id'>, Document {
  createdAt: Date;
  updatedAt: Date;
  fetchedAt: Date; // When the article was fetched from the API
}

// Create the schema for the Article model
const ArticleSchema = new Schema(
  {
    // Use articleId in the schema to avoid conflicts with Document._id
    articleId: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    content: { type: String, default: '' }, // Made optional with default empty string
    source: { type: String, required: true },
    sourceUrl: { type: String },
    author: { type: String },
    publishedAt: { type: String, required: true },
    location: { type: String, required: true },
    tags: [{ type: String }],
    mass: { type: Number, required: true },
    tier: { 
      type: String, 
      required: true, 
      enum: ['close', 'medium', 'far'] 
    },
    fetchedAt: { type: Date, default: Date.now }
  },
  { 
    timestamps: true, // Adds createdAt and updatedAt fields
    collection: 'articles' 
  }
);

// Create indexes for common queries
ArticleSchema.index({ source: 1, publishedAt: -1 });
ArticleSchema.index({ location: 1 });
ArticleSchema.index({ tier: 1 });
ArticleSchema.index({ fetchedAt: 1 });

// Create the model
export const ArticleModel = mongoose.model<ArticleDocument>('Article', ArticleSchema);

export default ArticleModel;
