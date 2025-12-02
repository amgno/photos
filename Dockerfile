FROM ruby:3.3

# Install dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy Gemfile
COPY Gemfile ./

# Install gems
RUN bundle install

# Copy the rest of the application
COPY . .

# Expose port 4000
EXPOSE 4000

# Start Jekyll
# We remove Gemfile.lock to force a fresh bundle install with the current Bundler version (avoiding the 1.17.2 downgrade issue)
CMD ["sh", "-c", "rm -f Gemfile.lock && bundle install && bundle exec jekyll serve --host 0.0.0.0 --config _config.yml,_config_local.yml"]
