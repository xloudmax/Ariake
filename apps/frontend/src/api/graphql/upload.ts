import { gql } from '@apollo/client'

// GraphQL Mutation for uploading images
export const UPLOAD_IMAGE = gql`
  mutation UploadImage($file: Upload!) {
    uploadImage(file: $file) {
      imageUrl
      deleteUrl
      filename
      size
    }
  }
`

// GraphQL Fragment for image upload response
export const IMAGE_UPLOAD_RESPONSE_FRAGMENT = gql`
  fragment ImageUploadResponse on ImageUploadResponse {
    imageUrl
    deleteUrl
    filename
    size
  }
`
