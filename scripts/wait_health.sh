MAX_RETRY=30

for ((i=1; i<=MAX_RETRY; i++)); do
    STATUS=$(docker inspect \
      --format='{{.State.Health.Status}}' \
      "$CONTAINER_ID")

    echo "Status: $STATUS"
    case "$STATUS" in
        healthy)
            echo "API Healthy"
            exit 0
            ;;
        unhealthy)
            echo "API Unhealthy"
            exit 1
            ;;
    esac

    echo "Waiting API... ($i/$MAX_RETRY)"
    sleep 3
done

echo "Health check timeout"
exit 1