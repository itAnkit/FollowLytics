# ==========================================
# Stage 1: Build the React Frontend (Vite)
# ==========================================
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# ==========================================
# Stage 2: Build the Java Spring Boot Backend
# ==========================================
FROM maven:3.9.6-eclipse-temurin-21-alpine AS backend-build
WORKDIR /app
COPY backend/pom.xml ./
RUN mvn dependency:go-offline -B
COPY backend/src ./src
# Copy built React frontend into Spring Boot static resources
COPY --from=frontend-build /app/frontend/dist ./src/main/resources/static
RUN mvn clean package -DskipTests -B

# ==========================================
# Stage 3: Production JRE Runner for Google Cloud Run
# ==========================================
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

ENV PORT=8080
EXPOSE 8080

COPY --from=backend-build /app/target/followlytics-backend-1.0.0.jar app.jar

ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
