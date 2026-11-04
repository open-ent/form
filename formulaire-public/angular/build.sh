#!/bin/bash

if [ ! -e node_modules ]
then
  mkdir node_modules
fi

case `uname -s` in
  MINGW*)
    USER_UID=1000
    GROUP_UID=1000
    ;;
  *)
    if [ -z ${USER_UID:+x} ]
    then
      USER_UID=`id -u`
      GROUP_GID=`id -g`
    fi
esac

clean () {
  docker-compose run --rm -u "$USER_UID:$GROUP_GID" gradle gradle clean
}

buildNode () {
  case `uname -s` in
    MINGW*)
      docker-compose run --rm -u "$USER_UID:$GROUP_GID" node sh -c "npm i -g -s yarn@1.22.22 && yarn install --no-bin-links && node_modules/gulp/bin/gulp.js build"
      ;;
    *)
      docker-compose run --rm -u "$USER_UID:$GROUP_GID" node sh -c "npm i -g -s yarn@1.22.22 && yarn install && node_modules/gulp/bin/gulp.js build"
  esac
}

testNode () {
  rm -rf coverage
  rm -rf */build
  case `uname -s` in
    MINGW*)
      docker-compose run --rm -u "$USER_UID:$GROUP_GID" node sh -c "npm i -g -s yarn@1.22.22 && yarn install --no-bin-links && node_modules/gulp/bin/gulp.js drop-cache &&  yarn test"
      ;;
    *)
      docker-compose run --rm -u "$USER_UID:$GROUP_GID" node sh -c "npm i -g -s yarn@1.22.22 && yarn install && node_modules/gulp/bin/gulp.js drop-cache && yarn test"
  esac
}

testNodeDev () {
  rm -rf coverage
  rm -rf */build
  case `uname -s` in
    MINGW*)
      docker-compose run --rm -u "$USER_UID:$GROUP_GID" node sh -c "npm i -g -s yarn@1.22.22 && yarn install --no-bin-links && node_modules/gulp/bin/gulp.js drop-cache &&  yarn run test:dev"
      ;;
    *)
      docker-compose run --rm -u "$USER_UID:$GROUP_GID" node sh -c "npm i -g -s yarn@1.22.22 && yarn install && node_modules/gulp/bin/gulp.js drop-cache && yarn run test:dev"
  esac
}

buildGulp() {
    docker-compose run --rm -u "$USER_UID:$GROUP_GID" node sh -c "npm i -g -s yarn@1.22.22 && yarn install --no-bin-links && node_modules/gulp/bin/gulp.js build"
}

buildCss() {
    docker-compose run --rm -u "$USER_UID:$GROUP_GID" node sh -c "npm i -g -s yarn@1.22.22 && yarn run build:sass"
}

publish () {
  if [ -e "?/.gradle" ] && [ ! -e "?/.gradle/gradle.properties" ]
  then
    echo "odeUsername=$NEXUS_ODE_USERNAME" > "?/.gradle/gradle.properties"
    echo "odePassword=$NEXUS_ODE_PASSWORD" >> "?/.gradle/gradle.properties"
    echo "sonatypeUsername=$NEXUS_SONATYPE_USERNAME" >> "?/.gradle/gradle.properties"
    echo "sonatypePassword=$NEXUS_SONATYPE_PASSWORD" >> "?/.gradle/gradle.properties"
  fi
  docker-compose run --rm -u "$USER_UID:$GROUP_GID" gradle gradle publish
}

for param in "$@"
do
  case $param in
    clean)
      clean
      ;;
    buildNode)
      buildNode
      ;;
    buildGulp)
      buildGulp
      ;;
    buildCss)
      buildCss
      ;;
    test)
      testNode
      ;;
    testNode)
      testNode
      ;;
    testNodeDev)
      testNodeDev
      ;;
    *)
      echo "Invalid argument : $param"
  esac
  if [ ! $? -eq 0 ]; then
    exit 1
  fi
done