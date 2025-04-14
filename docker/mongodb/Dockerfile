FROM mongo:6.0

# Set environment variables
ENV MONGO_INITDB_ROOT_USERNAME=admin
ENV MONGO_INITDB_ROOT_PASSWORD=password
ENV MONGO_INITDB_DATABASE=orbital_news

# Create a directory for MongoDB data
RUN mkdir -p /data/db

# Expose the MongoDB port
EXPOSE 27017

# Set the default command
CMD ["mongod"]
