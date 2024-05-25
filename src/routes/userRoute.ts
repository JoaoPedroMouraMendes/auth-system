import { Router } from "express"
import UserController from "../controllers/userController"

const route = Router()
const userController = new UserController()

route.get('/user/:id', userController.getUser)

route.post('/user', userController.createUser)

export default route