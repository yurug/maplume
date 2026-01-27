#!/bin/bash
set -e

# MaPlume Server Deployment Script for Scaleway
# Usage: ./deploy.sh [build|push|deploy|all]

# Configuration - Edit these values
REGISTRY="rg.fr-par.scw.cloud"
NAMESPACE="maplume"
IMAGE_NAME="server"
REGION="fr-par"
CONTAINER_NAME="maplume-server"

# Scaleway Serverless SQL Database
DATABASE_ID="4aa1df0d-fc15-467d-8288-c3d84bdf27a8"
DATABASE_HOST="${DATABASE_ID}.pg.sdb.fr-par.scw.cloud"
DATABASE_NAME="maplume"

# Container settings
CONTAINER_PORT=8443
CONTAINER_MIN_SCALE=0
CONTAINER_MAX_SCALE=2
CONTAINER_MEMORY=256

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Full image path
IMAGE="${REGISTRY}/${NAMESPACE}/${IMAGE_NAME}"

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1" >&2
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1" >&2
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

# Check required tools
check_requirements() {
    log_info "Checking requirements..."

    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi

    if ! command -v scw &> /dev/null; then
        log_error "Scaleway CLI is not installed"
        echo "Install with: curl -s https://raw.githubusercontent.com/scaleway/scaleway-cli/master/scripts/get.sh | sh"
        exit 1
    fi

    log_info "All requirements met"
}

# Build Docker image
build() {
    log_info "Building Docker image..."
    cd "$(dirname "$0")/../.."

    docker build -t "${IMAGE}:latest" -f packages/server/Dockerfile .

    log_info "Image built: ${IMAGE}:latest"
}

# Push to Scaleway Container Registry
push() {
    log_info "Logging into Scaleway Container Registry..."
    scw registry login

    log_info "Pushing image to registry..."
    docker push "${IMAGE}:latest"

    log_info "Image pushed: ${IMAGE}:latest"
}

# Get or create container namespace - sets NAMESPACE_ID global variable
get_or_create_namespace() {
    log_info "Checking for existing container namespace..."

    # Get the project ID from the API key's default project
    local PROJECT_ID=$(scw iam api-key get access-key="$(scw config get access-key)" -o json 2>/dev/null | jq -r '.APIKey.default_project_id // empty')

    if [ -z "$PROJECT_ID" ]; then
        log_error "Could not retrieve project ID"
        exit 1
    fi

    log_info "Using project: ${PROJECT_ID}"

    # Filter by both name and project
    local NS_LIST=$(scw container namespace list region=${REGION} -o json 2>/dev/null)
    NAMESPACE_ID=$(echo "$NS_LIST" | jq -r ".[] | select(.name==\"${NAMESPACE}\" and .project_id==\"${PROJECT_ID}\") | .id" 2>/dev/null || echo "")

    if [ -z "$NAMESPACE_ID" ] || [ "$NAMESPACE_ID" = "null" ]; then
        log_info "Creating container namespace: ${NAMESPACE}"
        local CREATE_OUTPUT=$(scw container namespace create name=${NAMESPACE} region=${REGION} project-id=${PROJECT_ID} -o json 2>/dev/null)
        NAMESPACE_ID=$(echo "$CREATE_OUTPUT" | jq -r '.id')
        log_info "Created namespace: ${NAMESPACE_ID}"
        # Wait for namespace to be ready
        sleep 5
    else
        log_info "Using existing namespace: ${NAMESPACE_ID}"
    fi
}

# Deploy to Scaleway Serverless Containers
deploy() {
    log_info "Starting deployment to Scaleway..."

    # Get Scaleway credentials for database
    # Serverless SQL Database uses IAM user ID (not access key) as username
    ACCESS_KEY=$(scw config get access-key 2>/dev/null)
    SECRET_KEY=$(scw config get secret-key 2>/dev/null)

    if [ -z "$ACCESS_KEY" ] || [ -z "$SECRET_KEY" ]; then
        log_error "Could not retrieve Scaleway credentials"
        exit 1
    fi

    # Get the IAM user ID (needed for database authentication)
    IAM_USER_ID=$(scw iam api-key get access-key="$ACCESS_KEY" -o json 2>/dev/null | jq -r '.APIKey.user_id // .user_id // empty')

    if [ -z "$IAM_USER_ID" ]; then
        log_error "Could not retrieve IAM user ID"
        exit 1
    fi

    log_info "Using IAM user ID: ${IAM_USER_ID}"

    # URL-encode the secret key using Python (handles all special characters)
    ENCODED_SECRET=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$SECRET_KEY', safe=''))")

    # Build DATABASE_URL using IAM user ID as username
    DATABASE_URL="postgres://${IAM_USER_ID}:${ENCODED_SECRET}@${DATABASE_HOST}:5432/${DATABASE_NAME}?sslmode=require"

    # Generate JWT secret if not provided
    if [ -z "$JWT_SECRET" ]; then
        log_warn "JWT_SECRET not set, generating a new one..."
        JWT_SECRET=$(openssl rand -base64 32)
        log_warn "Generated JWT_SECRET - save this securely!"
        echo "JWT_SECRET=${JWT_SECRET}"
    fi

    # Get or create namespace (sets NAMESPACE_ID)
    get_or_create_namespace

    # Check if container exists
    CONTAINER_LIST=$(scw container container list namespace-id=${NAMESPACE_ID} region=${REGION} -o json 2>/dev/null)
    CONTAINER_ID=$(echo "$CONTAINER_LIST" | jq -r ".[] | select(.name==\"${CONTAINER_NAME}\") | .id" 2>/dev/null || echo "")

    if [ -z "$CONTAINER_ID" ] || [ "$CONTAINER_ID" = "null" ]; then
        log_info "Creating new container: ${CONTAINER_NAME}"

        # Create container
        CREATE_OUTPUT=$(scw container container create \
            namespace-id="${NAMESPACE_ID}" \
            name="${CONTAINER_NAME}" \
            registry-image="${IMAGE}:latest" \
            port=${CONTAINER_PORT} \
            min-scale=${CONTAINER_MIN_SCALE} \
            max-scale=${CONTAINER_MAX_SCALE} \
            memory-limit=${CONTAINER_MEMORY} \
            region=${REGION} \
            environment-variables.NODE_ENV=production \
            environment-variables.PORT=${CONTAINER_PORT} \
            secret-environment-variables.0.key=DATABASE_URL \
            "secret-environment-variables.0.value=${DATABASE_URL}" \
            secret-environment-variables.1.key=JWT_SECRET \
            "secret-environment-variables.1.value=${JWT_SECRET}" \
            -o json 2>&1)

        CONTAINER_ID=$(echo "$CREATE_OUTPUT" | jq -r '.id' 2>/dev/null)

        if [ -z "$CONTAINER_ID" ] || [ "$CONTAINER_ID" = "null" ]; then
            log_error "Failed to create container:"
            echo "$CREATE_OUTPUT" >&2
            exit 1
        fi

        log_info "Container created: ${CONTAINER_ID}"
    else
        log_info "Updating existing container: ${CONTAINER_ID}"

        scw container container update \
            container-id="${CONTAINER_ID}" \
            region=${REGION} \
            redeploy=true

        log_info "Container updated and redeployed"
    fi

    # Deploy the container
    log_info "Deploying container..."
    scw container container deploy container-id="${CONTAINER_ID}" region=${REGION}

    # Get container endpoint
    sleep 5
    CONTAINER_INFO=$(scw container container get container-id="${CONTAINER_ID}" region=${REGION} -o json 2>/dev/null)
    ENDPOINT=$(echo "$CONTAINER_INFO" | jq -r '.domain_name')

    echo ""
    log_info "Deployment complete!"
    echo -e "${GREEN}========================================${NC}"
    echo -e "Container ID: ${CONTAINER_ID}"
    echo -e "Endpoint:     ${YELLOW}https://${ENDPOINT}${NC}"
    echo -e "Health check: https://${ENDPOINT}/health"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "Update your client API URL to:"
    echo "  https://${ENDPOINT}"
}

# Main
main() {
    check_requirements

    case "${1:-all}" in
        build)
            build
            ;;
        push)
            push
            ;;
        deploy)
            deploy
            ;;
        all)
            build
            push
            deploy
            ;;
        *)
            echo "Usage: $0 [build|push|deploy|all]"
            echo ""
            echo "Commands:"
            echo "  build   - Build Docker image locally"
            echo "  push    - Push image to Scaleway Container Registry"
            echo "  deploy  - Deploy to Scaleway Serverless Containers"
            echo "  all     - Build, push, and deploy (default)"
            exit 1
            ;;
    esac
}

main "$@"
