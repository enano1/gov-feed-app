export GOPATH=$HOME/go
export GOMODCACHE=$GOPATH/pkg/mod

echo 'export GOPATH=$HOME/go' >> ~/.zshrc
echo 'export GOMODCACHE=$GOPATH/pkg/mod' >> ~/.zshrc

source ~/.zshrc  # or ~/.bash_profile if using bash

go get -u github.com/gin-gonic/gin

go get github.com/gin-gonic/gin

go get github.com/mmcdole/gofeed

npm create vite@latest gov-feed-frontend -- --template react
cd gov-feed-frontend
npm install

nvm install 18
nvm use 18

to clean and run modules:

cd gov-feed-frontend
rm -rf node_modules
rm package-lock.json
npm install
