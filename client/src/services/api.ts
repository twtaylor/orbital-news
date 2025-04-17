import axios from 'axios';
import { Article, ArticleResponse } from '../types/Article';

// Use environment-specific API URL
const API_URL = import.meta.env.PROD ? 'https://localgrp.news/api' : '/api';

/**
 * Service for interacting with the Orbital News API
 */
export const ArticleService = {
  /**
   * Fetch all articles
   * @param zipCode Optional user zip code for location relevance
   * @param query Optional search query
   * @returns Promise with array of articles
   */
  async getArticles(zipCode?: string, query?: string): Promise<Article[]> {
    try {
      const params: Record<string, string> = {};
      if (zipCode) params.zipCode = zipCode;
      if (query) params.query = query;
      
      const response = await axios.get<ArticleResponse>(`${API_URL}/articles`, { params });
      return response.data.data.articles || [];
    } catch (error) {
      console.error('Error fetching articles:', error);
      throw error;
    }
  },

  /**
   * Fetch a specific article by ID
   * @param id Article ID
   * @returns Promise with the article
   */
  async getArticleById(id: string): Promise<Article> {
    try {
      const response = await axios.get<ArticleResponse>(`${API_URL}/articles/${id}`);
      if (!response.data.data.article) {
        throw new Error('Article not found');
      }
      return response.data.data.article;
    } catch (error) {
      console.error(`Error fetching article ${id}:`, error);
      throw error;
    }
  },

  // markArticleAsRead method removed as we no longer track read status
};
