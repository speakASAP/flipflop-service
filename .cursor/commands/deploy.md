# Production Deployment

## Task: Deploy our application on production

## Details needed

Our application consists of 5 microservices in /home/statex/. Access via ssh statex.

Initial task: connect to the production folder using ssh statex
You can see folder "e-commerce" there.
Initiate it with git@github.com:speakASAP/e-commerce.git
ssh statex "cd e-commerce && git pull

After that we need to register it on nginx-microservice. You should do it using scripts from ssh statex && cd nginx-microservice && ls -la scripts
You need to check if flipflop.statex.cz registered already. If not - register it on nginx-microservice blue/green environment.
Read nginx-microservice/README.md to understand how to do it.

pull github repos using ssh statex "cd e-commerce && git pull && cd ../nginx-microservice && git pull && docker exec nginx-microservice nginx -t && docker exec nginx-microservice nginx -s reload"
In case there will be local file changes they needs to be checked against github version and git repo should be corrected with working codebase.

nginx-microservice handles blue/green deployments.
Use the same nginx and database setup to manage flipflop.statex.cz:
Run: ssh statex && cd nginx-microservice && ./scripts/blue-green/deploy.sh e-commerce.

database-server is the PostgreSQL database for the app.

Applications are located at /Users/sergiystashok/Documents/GitHub/ (prod: /home/statex).

Configs and logs are in project root folders and ./logs/.
Environment variables are protected and stored within root folder for each project. Use command cat .env to see it

This modular architecture improves development and separation of services.

Success is when <https://flipflop.statex.cz> is accessible without console or log errors.
