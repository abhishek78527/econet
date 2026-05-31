package db

import (
	"context"
	"log"
	"os"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var client *mongo.Client
var database *mongo.Database

func Connect(ctx context.Context) error {
	uri := os.Getenv("MONGODB_URI")
	if uri == "" {
		uri = "mongodb://localhost:27017"
	}
	dbName := os.Getenv("DB_NAME")
	if dbName == "" {
		dbName = "linkup"
	}

	clientOptions := options.Client().ApplyURI(uri)
	var err error
	client, err = mongo.Connect(ctx, clientOptions)
	if err != nil {
		return err
	}
	if err = client.Ping(ctx, nil); err != nil {
		return err
	}
	database = client.Database(dbName)
	log.Println("Connected to MongoDB:", dbName)
	return nil
}

func Disconnect(ctx context.Context) {
	if client != nil {
		client.Disconnect(ctx)
	}
}

func GetCollection(name string) *mongo.Collection {
	return database.Collection(name)
}
