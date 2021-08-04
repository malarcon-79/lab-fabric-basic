package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"github.com/hyperledger/fabric-chaincode-go/shim"
	pb "github.com/hyperledger/fabric-protos-go/peer"
	"go.uber.org/zap"
)

// TestChaincode structure for defining the shim
type TestChaincode struct {
	logger *zap.SugaredLogger
}

// StockSymbol data store representing a Document
type StockSymbol struct {
	ISIN        string `json:"ISIN"`
	Symbol      string `json:"Symbol"`
	Description string `json:"Description"`
	Price       string `json:"Price"`
}

func main() {
	zl, _ := zap.NewProduction()
	logger := zl.With(zap.String("module", "test-chaincode-go")).Sugar()
	logger.Info("Starting Test chaincode GO")

	chaincode := &TestChaincode{
		logger: logger,
	}
	err := shim.Start(chaincode)
	if err != nil {
		logger.Errorf("Error starting Test chaincode: %s", err)
	}
}

// Init function used to initialize the Closest Snapshot in-memory Index
func (c *TestChaincode) Init(stub shim.ChaincodeStubInterface) pb.Response {
	c.logger.Info("Initializing Test Chaincode")

	return shim.Success(nil)
}

// Invoke accepts all invoke commands from the blockchain and decides which function to call based on the inputs
func (c *TestChaincode) Invoke(stub shim.ChaincodeStubInterface) pb.Response {
	c.logger.Debug("V1.0")

	function, args := stub.GetFunctionAndParameters()

	switch function {
	case "init":
		return c.Init(stub)
	case "ping":
		return shim.Success([]byte("pong"))
	case "find":
		return c.find(stub, args[0])
	case "store":
		return c.store(stub, args[0])
	}

	c.logger.Errorf("Invalid Test Invoke Function: %s", function)
	return shim.Error(fmt.Sprint("Invalid Invoke Function: ", function))
}

// ---------------------------- //
// Common Shim usage functions  //
// ---------------------------- //

// query executes a query on the Worldstate DB
func query(stub shim.ChaincodeStubInterface, jsonSnip string) ([]string, error) {
	//create iterator from selector key
	iter, err := stub.GetQueryResult(jsonSnip)
	if err != nil {
		return nil, err
	}
	defer iter.Close()

	var outArray []string
	for iter.HasNext() {
		data, err := iter.Next()
		if err != nil {
			return nil, err
		}
		outArray = append(outArray, string(data.Value))
	}

	return outArray, nil
}

// convertQueryResultsToJSONByteArray converts an array of JSON Strings to a
// byte array that is also a JSON Array
func convertQueryResultsToJSONByteArray(rows []string) []byte {
	var buffer bytes.Buffer

	buffer.WriteString("[")
	if len(rows) > 0 {
		buffer.WriteString(strings.Join(rows, ","))
	}
	buffer.WriteString("]")

	return buffer.Bytes()
}

// ----------------------------- //
// Chaincode Business functions  //
// ----------------------------- //

// find executes a Selector query against the WorldState and returns the results in JSON format.
func (c *TestChaincode) find(stub shim.ChaincodeStubInterface, jsonSnip string) pb.Response {
	c.logger.Info("Beginning JSON query")

	results, err := query(stub, jsonSnip)
	if err != nil {
		c.logger.Error(err)
		return shim.Error("Error executing query")
	}

	outBytes := convertQueryResultsToJSONByteArray(results)
	return shim.Success(outBytes)
}

// store stores the StockSymbol as either an insert or an update transaction
func (c *TestChaincode) store(stub shim.ChaincodeStubInterface, jsonSnip string) pb.Response {
	incoming := StockSymbol{}
	err := json.Unmarshal([]byte(jsonSnip), &incoming)
	if err != nil {
		c.logger.Error("Error in store(): ", err)
		return shim.Error("Error parsing input")
	}

	if len(incoming.ISIN) == 0 || len(incoming.Symbol) == 0 {
		c.logger.Error("Invalid ISIN or Symbol ", err)
		return shim.Error("Invalid ISIN or Symbol")
	}
	if _, err := strconv.ParseInt(incoming.Price, 10, 64); err != nil {
		c.logger.Error("Invalid Price ", err)
		return shim.Error("Invalid Price")
	}

	bytes, err := json.Marshal(incoming)
	if err != nil {
		c.logger.Info("Error marshalling StockSymbol: ", incoming.Symbol)
		return shim.Error("Error marshalling StockSymbol" + incoming.Symbol)
	}

	err = stub.PutState(incoming.Symbol, bytes)
	if err != nil {
		c.logger.Info("Error writing StockSymbol: ", incoming.Symbol)
		return shim.Error("Error writing StockSymbol: " + incoming.Symbol)
	}
	c.logger.Info("Loaded StockSymbol: ", incoming.Symbol)

	return shim.Success(nil)
}
