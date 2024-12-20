# Step 1: Use an official Node.js runtime as a parent image
# Use Node.js for building the frontend
FROM node:18 AS build

# Set working directory in the container
WORKDIR /app

# Copy only package.json and package-lock.json (if exists) to leverage caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the app's source code
COPY . .

# Build the React app for production
RUN npm run build

# Step 2: Use an Nginx image to serve the static files
FROM nginx:alpine

# Remove default Nginx configuration and replace with custom
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d

# Copy the built React app from the previous step to the Nginx directory
COPY --from=build /app/build /usr/share/nginx/html

# Expose port 80 for HTTP traffic
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
