FROM alpine:3.19

RUN mkdir -p /datasets/public \
    /datasets/private


VOLUME ["/datasets"]

CMD ["sh", "-c", "echo 'Dataset volume ready' && tail -f /dev/null"]