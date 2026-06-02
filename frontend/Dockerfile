FROM node:18-alpine

WORKDIR /app

COPY package.json .
# We will use npm install --legacy-peer-deps to avoid any potential dependency peer conflicts
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
