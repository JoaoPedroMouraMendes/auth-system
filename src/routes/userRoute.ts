import { Router } from "express"
import userController from "../controllers/userController"

const route = Router()

route.get('/user/:id', userController.getUser)

route.post('/user', userController.createUser)

route.get('/user/validation/:token', userController.validateUserAccount)

export default route